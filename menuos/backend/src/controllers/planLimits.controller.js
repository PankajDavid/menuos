import { query } from '../db/pool.js';

// GET /api/platform/plan-limits
export async function getPlanLimits(req, res, next) {
  try {
    const result = await query('SELECT * FROM plan_limits ORDER BY monthly_price ASC');
    res.json(result.rows);
  } catch (err) { next(err); }
}

// PATCH /api/platform/plan-limits/:plan
export async function updatePlanLimits(req, res, next) {
  try {
    const { plan } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      'max_menu_items', 'max_tables', 'max_staff_users',
      'max_photos_per_month', 'max_videos_per_month',
      'allows_custom_domain', 'allows_white_label', 'allows_api_access',
      'support_level', 'monthly_price', 'yearly_price', 'is_active'
    ];
    
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    setClauses.push(`updated_at = NOW()`);
    values.push(plan);
    
    const result = await query(
      `UPDATE plan_limits SET ${setClauses.join(', ')} WHERE plan = $${paramIndex} RETURNING *`,
      values
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/limits - Get current restaurant's limits
export async function getRestaurantLimits(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    
    // Get restaurant's plan
    const restaurantResult = await query(
      'SELECT subscription_plan FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    
    if (!restaurantResult.rows[0]) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const plan = restaurantResult.rows[0].subscription_plan;
    
    // Get plan limits
    const limitsResult = await query(
      'SELECT * FROM plan_limits WHERE plan = $1',
      [plan]
    );
    
    // Get current usage
    const usageResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM menu_items WHERE restaurant_id = $1) as menu_items_count,
        (SELECT COUNT(*) FROM tables WHERE restaurant_id = $1) as tables_count,
        (SELECT COUNT(*) FROM users WHERE restaurant_id = $1 AND role != 'platform_admin') as staff_count
    `, [restaurantId]);
    
    res.json({
      plan,
      limits: limitsResult.rows[0] || null,
      usage: usageResult.rows[0] || { menu_items_count: 0, tables_count: 0, staff_count: 0 }
    });
  } catch (err) { next(err); }
}

// Check if restaurant has exceeded limits
export async function checkLimit(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { resource } = req.params; // menu_items, tables, staff
    
    const restaurantResult = await query(
      'SELECT subscription_plan FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    
    const plan = restaurantResult.rows[0]?.subscription_plan || 'free';
    
    const limitsResult = await query(
      'SELECT * FROM plan_limits WHERE plan = $1',
      [plan]
    );
    
    const limits = limitsResult.rows[0];
    if (!limits) {
      return res.status(500).json({ error: 'Plan limits not found' });
    }
    
    let limitField;
    let countQuery;
    
    switch(resource) {
      case 'menu_items':
        limitField = 'max_menu_items';
        countQuery = 'SELECT COUNT(*) FROM menu_items WHERE restaurant_id = $1';
        break;
      case 'tables':
        limitField = 'max_tables';
        countQuery = 'SELECT COUNT(*) FROM tables WHERE restaurant_id = $1';
        break;
      case 'staff':
        limitField = 'max_staff_users';
        countQuery = "SELECT COUNT(*) FROM users WHERE restaurant_id = $1 AND role != 'platform_admin'";
        break;
      default:
        return res.status(400).json({ error: 'Invalid resource type' });
    }
    
    const maxLimit = limits[limitField];
    const countResult = await query(countQuery, [restaurantId]);
    const currentCount = parseInt(countResult.rows[0].count);
    
    res.json({
      resource,
      limit: maxLimit,
      current: currentCount,
      remaining: Math.max(0, maxLimit - currentCount),
      hasExceeded: currentCount >= maxLimit,
      canAdd: currentCount < maxLimit
    });
  } catch (err) { next(err); }
}
