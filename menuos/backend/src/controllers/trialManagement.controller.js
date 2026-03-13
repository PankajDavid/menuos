import { query } from '../db/pool.js';

// GET /api/platform/trials - Get all trial data
export async function getTrials(req, res, next) {
  try {
    const { status, days } = req.query;
    
    let sql = `
      SELECT 
        tc.*,
        r.name as restaurant_name,
        r.slug as restaurant_slug,
        r.subscription_plan as current_plan,
        r.is_active,
        u.name as converted_by_name,
        CASE 
          WHEN tc.converted_at IS NOT NULL THEN 'converted'
          WHEN tc.expires_at < NOW() THEN 'expired'
          ELSE 'active'
        END as trial_status,
        EXTRACT(DAY FROM (tc.expires_at - NOW())) as days_remaining
      FROM trial_conversions tc
      JOIN restaurants r ON tc.restaurant_id = r.id
      LEFT JOIN users u ON tc.converted_by_user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      if (status === 'active') {
        sql += ` AND tc.converted_at IS NULL AND tc.expires_at >= NOW()`;
      } else if (status === 'expired') {
        sql += ` AND tc.converted_at IS NULL AND tc.expires_at < NOW()`;
      } else if (status === 'converted') {
        sql += ` AND tc.converted_at IS NOT NULL`;
      }
    }
    
    if (days) {
      params.push(parseInt(days));
      sql += ` AND tc.expires_at <= NOW() + INTERVAL '${days} days'`;
    }
    
    sql += ` ORDER BY tc.created_at DESC`;
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/platform/trials/stats - Get trial statistics
export async function getTrialStats(req, res, next) {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE converted_at IS NULL AND expires_at >= NOW()) as active_trials,
        COUNT(*) FILTER (WHERE converted_at IS NULL AND expires_at < NOW()) as expired_trials,
        COUNT(*) FILTER (WHERE converted_at IS NOT NULL) as converted_trials,
        COUNT(*) as total_trials,
        
        -- Conversion rate
        CASE 
          WHEN COUNT(*) FILTER (WHERE converted_at IS NOT NULL OR expires_at < NOW()) > 0 
          THEN ROUND(
            COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::numeric / 
            COUNT(*) FILTER (WHERE converted_at IS NOT NULL OR expires_at < NOW())::numeric * 100, 
            2
          )
          ELSE 0 
        END as conversion_rate,
        
        -- Expiring soon (next 7 days)
        COUNT(*) FILTER (
          WHERE converted_at IS NULL 
          AND expires_at >= NOW() 
          AND expires_at <= NOW() + INTERVAL '7 days'
        ) as expiring_soon,
        
        -- Recent conversions (last 30 days)
        COUNT(*) FILTER (
          WHERE converted_at IS NOT NULL 
          AND converted_at >= NOW() - INTERVAL '30 days'
        ) as recent_conversions
      FROM trial_conversions
    `);
    
    // Get conversion by plan
    const byPlanResult = await query(`
      SELECT 
        converted_to_plan,
        COUNT(*) as count
      FROM trial_conversions
      WHERE converted_at IS NOT NULL
      GROUP BY converted_to_plan
      ORDER BY count DESC
    `);
    
    // Get conversion by source
    const bySourceResult = await query(`
      SELECT 
        source,
        COUNT(*) FILTER (WHERE converted_at IS NOT NULL) as converted,
        COUNT(*) as total,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND(COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2)
          ELSE 0 
        END as conversion_rate
      FROM trial_conversions
      GROUP BY source
      ORDER BY total DESC
    `);
    
    res.json({
      ...result.rows[0],
      by_plan: byPlanResult.rows,
      by_source: bySourceResult.rows
    });
  } catch (err) { next(err); }
}

// POST /api/platform/trials - Start trial for restaurant
export async function startTrial(req, res, next) {
  try {
    const { restaurant_id, duration_days, source, notes } = req.body;
    
    if (!restaurant_id) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }
    
    // Check if already has active trial
    const existingResult = await query(
      'SELECT id FROM trial_conversions WHERE restaurant_id = $1 AND converted_at IS NULL AND expires_at >= NOW()',
      [restaurant_id]
    );
    
    if (existingResult.rows[0]) {
      return res.status(409).json({ error: 'Restaurant already has an active trial' });
    }
    
    const duration = duration_days || 14;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);
    
    const result = await query(`
      INSERT INTO trial_conversions (restaurant_id, expires_at, trial_duration_days, source, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [restaurant_id, expiresAt, duration, source || 'organic', notes]);
    
    // Update restaurant to pro plan during trial
    await query(`
      UPDATE restaurants 
      SET subscription_plan = 'pro', updated_at = NOW()
      WHERE id = $1
    `, [restaurant_id]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/platform/trials/:id/convert - Mark trial as converted
export async function convertTrial(req, res, next) {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    const userId = req.user.id;
    
    const result = await query(`
      UPDATE trial_conversions 
      SET converted_at = NOW(), converted_to_plan = $1, converted_by_user_id = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [plan || 'pro', userId, id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Trial not found' });
    }
    
    // Update restaurant plan
    await query(`
      UPDATE restaurants 
      SET subscription_plan = $1, updated_at = NOW()
      WHERE id = $2
    `, [plan || 'pro', result.rows[0].restaurant_id]);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/platform/trials/:id/extend - Extend trial
export async function extendTrial(req, res, next) {
  try {
    const { id } = req.params;
    const { days } = req.body;
    
    if (!days || days <= 0) {
      return res.status(400).json({ error: 'Valid days extension is required' });
    }
    
    const result = await query(`
      UPDATE trial_conversions 
      SET expires_at = expires_at + INTERVAL '${days} days', updated_at = NOW()
      WHERE id = $1 AND converted_at IS NULL
      RETURNING *
    `, [id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Active trial not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/platform/trials/:id/engagement - Get engagement data
export async function getTrialEngagement(req, res, next) {
  try {
    const { id } = req.params;
    
    // Get restaurant_id from trial
    const trialResult = await query('SELECT restaurant_id FROM trial_conversions WHERE id = $1', [id]);
    if (!trialResult.rows[0]) {
      return res.status(404).json({ error: 'Trial not found' });
    }
    
    const restaurantId = trialResult.rows[0].restaurant_id;
    
    // Get engagement summary
    const summaryResult = await query(`
      SELECT 
        event_type,
        COUNT(*) as count,
        MIN(created_at) as first_occurrence,
        MAX(created_at) as last_occurrence
      FROM trial_engagement
      WHERE restaurant_id = $1
      GROUP BY event_type
      ORDER BY count DESC
    `, [restaurantId]);
    
    // Get recent events
    const eventsResult = await query(`
      SELECT event_type, event_data, created_at
      FROM trial_engagement
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [restaurantId]);
    
    res.json({
      summary: summaryResult.rows,
      recent_events: eventsResult.rows
    });
  } catch (err) { next(err); }
}

// POST /api/restaurants/:slug/trial/track - Track engagement event
export async function trackEngagement(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { event_type, event_data } = req.body;
    
    if (!event_type) {
      return res.status(400).json({ error: 'Event type is required' });
    }
    
    const result = await query(`
      INSERT INTO trial_engagement (restaurant_id, event_type, event_data)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [restaurantId, event_type, event_data ? JSON.stringify(event_data) : null]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}
