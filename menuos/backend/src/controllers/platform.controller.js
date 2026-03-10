import { query } from '../db/pool.js';

// GET /api/platform/restaurants
export async function getAllRestaurants(req, res, next) {
  try {
    const result = await query(`
      SELECT r.*,
        (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id) as total_orders,
        (SELECT COALESCE(SUM(total_amount),0) FROM orders o
         WHERE o.restaurant_id = r.id AND payment_status = 'paid') as total_revenue,
        (SELECT COUNT(*) FROM menu_items m WHERE m.restaurant_id = r.id) as menu_count
      FROM restaurants r
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/platform/analytics
export async function getPlatformAnalytics(req, res, next) {
  try {
    const [totals, planBreakdown, recentSignups, dailyOrders] = await Promise.all([
      query(`SELECT
        (SELECT COUNT(*) FROM restaurants WHERE is_active=TRUE) as total_restaurants,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status='paid') as total_revenue,
        (SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE) as orders_today`),

      query(`SELECT subscription_plan, COUNT(*) as count
             FROM restaurants WHERE is_active=TRUE GROUP BY subscription_plan`),

      query(`SELECT DATE(created_at) as date, COUNT(*) as signups
             FROM restaurants WHERE created_at >= NOW() - INTERVAL '30 days'
             GROUP BY DATE(created_at) ORDER BY date`),

      query(`SELECT DATE(created_at) as date, COUNT(*) as orders,
             SUM(total_amount) as revenue
             FROM orders WHERE created_at >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at) ORDER BY date`),
    ]);

    res.json({
      ...totals.rows[0],
      plan_breakdown: planBreakdown.rows,
      recent_signups: recentSignups.rows,
      daily_orders: dailyOrders.rows,
    });
  } catch (err) { next(err); }
}

// PATCH /api/platform/restaurants/:id/plan
export async function updatePlan(req, res, next) {
  try {
    const { plan } = req.body;
    const validPlans = ['free', 'basic', 'pro'];
    if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

    const result = await query(
      'UPDATE restaurants SET subscription_plan = $1 WHERE id = $2 RETURNING id, name, subscription_plan',
      [plan, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// PATCH /api/platform/restaurants/:id/toggle
export async function toggleRestaurant(req, res, next) {
  try {
    const result = await query(
      'UPDATE restaurants SET is_active = NOT is_active WHERE id = $1 RETURNING id, name, is_active',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}
