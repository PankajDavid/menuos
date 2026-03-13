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
    const [totals, planBreakdown, recentSignups, dailyOrders, revenueByMonth, atRiskRestaurants] = await Promise.all([
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

      // Monthly revenue for last 6 months
      query(`SELECT 
             DATE_TRUNC('month', created_at) as month,
             COUNT(*) as orders,
             COALESCE(SUM(total_amount), 0) as revenue
             FROM orders 
             WHERE payment_status = 'paid' 
             AND created_at >= NOW() - INTERVAL '6 months'
             GROUP BY DATE_TRUNC('month', created_at)
             ORDER BY month DESC`),

      // At-risk restaurants (no orders in last 30 days)
      query(`SELECT r.id, r.name, r.owner_email, r.subscription_plan, r.created_at,
             (SELECT MAX(created_at) FROM orders o WHERE o.restaurant_id = r.id) as last_order_date
             FROM restaurants r
             WHERE r.is_active = TRUE
             AND NOT EXISTS (
               SELECT 1 FROM orders o 
               WHERE o.restaurant_id = r.id 
               AND o.created_at >= NOW() - INTERVAL '30 days'
             )
             ORDER BY r.created_at DESC
             LIMIT 10`)
    ]);

    res.json({
      ...totals.rows[0],
      plan_breakdown: planBreakdown.rows,
      recent_signups: recentSignups.rows,
      daily_orders: dailyOrders.rows,
      revenue_by_month: revenueByMonth.rows,
      at_risk_restaurants: atRiskRestaurants.rows
    });
  } catch (err) { next(err); }
}

// PATCH /api/platform/restaurants/:id/plan
export async function updatePlan(req, res, next) {
  try {
    const { plan } = req.body;
    const validPlans = ['free', 'basic', 'pro', 'premium'];
    if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

    const result = await query(
      'UPDATE restaurants SET subscription_plan = $1 WHERE id = $2 RETURNING id, name, subscription_plan',
      [plan, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// PATCH /api/platform/users/:id/role
export async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'staff', 'kitchen', 'platform_admin'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role',
      [role, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
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

// GET /api/platform/users
export async function getAllUsers(req, res, next) {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login_at, u.created_at,
             r.name as restaurant_name, r.slug as restaurant_slug
      FROM users u
      LEFT JOIN restaurants r ON u.restaurant_id = r.id
      WHERE u.role != 'platform_admin'
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/platform/export/restaurants - Export restaurants to CSV
export async function exportRestaurants(req, res, next) {
  try {
    const result = await query(`
      SELECT r.id, r.name, r.slug, r.owner_email, r.phone, r.subscription_plan, 
             r.subscription_status, r.payment_status, r.is_active, r.created_at,
             r.last_payment_date, r.next_payment_date, r.grace_period_end_date,
             (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id) as total_orders,
             (SELECT COALESCE(SUM(total_amount),0) FROM orders o WHERE o.restaurant_id = r.id AND payment_status = 'paid') as total_revenue,
             (SELECT COUNT(*) FROM menu_items m WHERE m.restaurant_id = r.id) as menu_items_count
      FROM restaurants r
      ORDER BY r.created_at DESC
    `);

    // Convert to CSV
    const headers = ['ID', 'Name', 'Slug', 'Owner Email', 'Phone', 'Plan', 'Status', 'Payment Status', 'Active', 'Created At', 'Last Payment', 'Next Payment', 'Grace Period End', 'Total Orders', 'Total Revenue', 'Menu Items'];
    const rows = result.rows.map(r => [
      r.id, r.name, r.slug, r.owner_email, r.phone || '', r.subscription_plan,
      r.subscription_status || 'active', r.payment_status || 'pending', r.is_active,
      new Date(r.created_at).toISOString(), r.last_payment_date || '', r.next_payment_date || '',
      r.grace_period_end_date || '', r.total_orders, r.total_revenue, r.menu_items_count
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=restaurants.csv');
    res.send(csv);
  } catch (err) { next(err); }
}

// GET /api/platform/export/orders - Export orders to CSV
export async function exportOrders(req, res, next) {
  try {
    const result = await query(`
      SELECT o.id, o.restaurant_id, r.name as restaurant_name, o.table_number, 
             o.total_amount, o.payment_status, o.status, o.created_at
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      ORDER BY o.created_at DESC
      LIMIT 10000
    `);

    const headers = ['ID', 'Restaurant', 'Table Number', 'Total Amount', 'Payment Status', 'Order Status', 'Created At'];
    const rows = result.rows.map(o => [
      o.id, o.restaurant_name, o.table_number, o.total_amount, o.payment_status, o.status, new Date(o.created_at).toISOString()
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csv);
  } catch (err) { next(err); }
}

// GET /api/platform/popular-items - Most popular menu items across all restaurants
export async function getPopularItems(req, res, next) {
  try {
    const result = await query(`
      SELECT 
        mi.id,
        mi.name,
        mi.price,
        mi.category,
        r.name as restaurant_name,
        r.slug as restaurant_slug,
        COUNT(oi.id) as times_ordered,
        COALESCE(SUM(oi.quantity), 0) as total_quantity_sold
      FROM menu_items mi
      JOIN restaurants r ON mi.restaurant_id = r.id
      LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
      WHERE mi.is_available = TRUE
      GROUP BY mi.id, mi.name, mi.price, mi.category, r.name, r.slug
      ORDER BY total_quantity_sold DESC
      LIMIT 50
    `);

    res.json(result.rows);
  } catch (err) { next(err); }
}
