import { query } from '../db/pool.js';
import crypto from 'crypto';

// Generate unique referral code
function generateReferralCode() {
  return 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET /api/platform/referrals - Get all referrals (platform admin)
export async function getReferrals(req, res, next) {
  try {
    const { status } = req.query;
    
    let sql = `
      SELECT 
        r.*,
        rc.code as referral_code,
        referrer.name as referrer_name,
        referrer.slug as referrer_slug,
        referred.name as referred_name,
        referred.slug as referred_slug,
        referred.subscription_plan as referred_plan
      FROM referrals r
      LEFT JOIN referral_codes rc ON r.referral_code_id = rc.id
      LEFT JOIN restaurants referrer ON r.referrer_restaurant_id = referrer.id
      LEFT JOIN restaurants referred ON r.referred_restaurant_id = referred.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    }
    
    sql += ` ORDER BY r.created_at DESC`;
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/platform/referrals/stats - Get referral statistics
export async function getReferralStats(req, res, next) {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'converted') as converted_count,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
        COUNT(*) as total_referrals,
        COUNT(DISTINCT referrer_restaurant_id) as total_referrers,
        COALESCE(SUM(reward_paid_amount) FILTER (WHERE reward_paid = TRUE), 0) as total_rewards_paid,
        COALESCE(SUM(reward_paid_amount) FILTER (WHERE reward_paid = FALSE AND status = 'converted'), 0) as pending_rewards
      FROM referrals
    `);
    
    // Top referrers
    const topReferrersResult = await query(`
      SELECT 
        r.id,
        r.name,
        r.slug,
        COUNT(ref.id) as referral_count,
        COUNT(ref.id) FILTER (WHERE ref.status = 'converted') as converted_count,
        COALESCE(SUM(ref.reward_paid_amount) FILTER (WHERE ref.reward_paid = TRUE), 0) as total_rewards
      FROM restaurants r
      LEFT JOIN referrals ref ON ref.referrer_restaurant_id = r.id
      WHERE ref.id IS NOT NULL
      GROUP BY r.id, r.name, r.slug
      ORDER BY converted_count DESC
      LIMIT 10
    `);
    
    // Active referral codes
    const codesResult = await query(`
      SELECT 
        rc.*,
        r.name as restaurant_name,
        r.slug as restaurant_slug
      FROM referral_codes rc
      JOIN restaurants r ON rc.restaurant_id = r.id
      WHERE rc.is_active = TRUE
      ORDER BY rc.used_count DESC
      LIMIT 20
    `);
    
    res.json({
      ...result.rows[0],
      top_referrers: topReferrersResult.rows,
      active_codes: codesResult.rows
    });
  } catch (err) { next(err); }
}

// POST /api/restaurants/:slug/referral-codes - Create referral code
export async function createReferralCode(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const userId = req.user.id;
    const { discount_percent, reward_amount, max_uses, expires_at } = req.body;
    
    const code = generateReferralCode();
    
    const result = await query(`
      INSERT INTO referral_codes (code, restaurant_id, created_by_user_id, discount_percent, reward_amount, max_uses, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      code,
      restaurantId,
      userId,
      discount_percent || 20,
      reward_amount || 500,
      max_uses || null,
      expires_at || null
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { 
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Referral code already exists' });
    }
    next(err); 
  }
}

// GET /api/restaurants/:slug/referral-codes - Get my referral codes
export async function getMyReferralCodes(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    
    const result = await query(`
      SELECT * FROM referral_codes
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
    `, [restaurantId]);
    
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/referrals - Get my referrals
export async function getMyReferrals(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    
    const result = await query(`
      SELECT 
        r.*,
        referred.name as referred_name,
        referred.slug as referred_slug,
        rc.code as referral_code
      FROM referrals r
      LEFT JOIN restaurants referred ON r.referred_restaurant_id = referred.id
      LEFT JOIN referral_codes rc ON r.referral_code_id = rc.id
      WHERE r.referrer_restaurant_id = $1
      ORDER BY r.created_at DESC
    `, [restaurantId]);
    
    res.json(result.rows);
  } catch (err) { next(err); }
}

// POST /api/referrals/apply - Apply referral code during signup
export async function applyReferralCode(req, res, next) {
  try {
    const { code, restaurant_id } = req.body;
    
    if (!code || !restaurant_id) {
      return res.status(400).json({ error: 'Code and restaurant_id are required' });
    }
    
    // Get referral code
    const codeResult = await query(`
      SELECT * FROM referral_codes 
      WHERE code = $1 AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (max_uses IS NULL OR used_count < max_uses)
    `, [code]);
    
    if (!codeResult.rows[0]) {
      return res.status(404).json({ error: 'Invalid or expired referral code' });
    }
    
    const referralCode = codeResult.rows[0];
    
    // Check if restaurant already has a referral
    const existingResult = await query(
      'SELECT id FROM referrals WHERE referred_restaurant_id = $1',
      [restaurant_id]
    );
    
    if (existingResult.rows[0]) {
      return res.status(409).json({ error: 'Restaurant already has a referral record' });
    }
    
    // Create referral record
    const referralResult = await query(`
      INSERT INTO referrals (referral_code_id, referrer_restaurant_id, referred_restaurant_id, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `, [referralCode.id, referralCode.restaurant_id, restaurant_id]);
    
    // Increment code usage
    await query(
      'UPDATE referral_codes SET used_count = used_count + 1, updated_at = NOW() WHERE id = $1',
      [referralCode.id]
    );
    
    res.status(201).json({
      ...referralResult.rows[0],
      discount_percent: referralCode.discount_percent,
      reward_amount: referralCode.reward_amount
    });
  } catch (err) { next(err); }
}

// POST /api/platform/referrals/:id/mark-converted - Mark referral as converted
export async function markReferralConverted(req, res, next) {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE referrals 
      SET status = 'converted', converted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `, [id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Pending referral not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/platform/referrals/:id/pay-reward - Mark reward as paid
export async function payReferralReward(req, res, next) {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    const result = await query(`
      UPDATE referrals 
      SET reward_paid = TRUE, reward_paid_at = NOW(), reward_paid_amount = $1, updated_at = NOW()
      WHERE id = $2 AND status = 'converted' AND reward_paid = FALSE
      RETURNING *
    `, [amount, id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Convertible referral not found or already paid' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// PATCH /api/platform/referral-codes/:id - Update referral code (platform admin)
export async function updateReferralCode(req, res, next) {
  try {
    const { id } = req.params;
    const { discount_percent, reward_amount, max_uses, is_active, expires_at } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (discount_percent !== undefined) {
      updates.push(`discount_percent = $${paramIndex++}`);
      values.push(discount_percent);
    }
    if (reward_amount !== undefined) {
      updates.push(`reward_amount = $${paramIndex++}`);
      values.push(reward_amount);
    }
    if (max_uses !== undefined) {
      updates.push(`max_uses = $${paramIndex++}`);
      values.push(max_uses);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (expires_at !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(expires_at);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await query(
      `UPDATE referral_codes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Referral code not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}
