import { query } from '../db/pool.js';

// GET /api/restaurants/:slug  — public
export async function getRestaurant(req, res) {
  const { password_hash, ...safe } = req.tenant;
  res.json(safe);
}

// PUT /api/restaurants/:slug
export async function updateRestaurant(req, res, next) {
  try {
    const { name, phone, address, gst_number, logo_url, settings } = req.body;
    const result = await query(
      `UPDATE restaurants SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        gst_number = COALESCE($4, gst_number),
        logo_url = COALESCE($5, logo_url),
        settings = COALESCE($6, settings)
       WHERE id = $7 RETURNING *`,
      [name, phone, address, gst_number, logo_url, settings ? JSON.stringify(settings) : null, req.tenant.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/analytics
export async function getAnalytics(req, res, next) {
  try {
    const rid = req.tenant.id;

    const [revenueToday, ordersToday, topDish, avgOrder, ordersByStatus, revenueWeek] =
      await Promise.all([
        query(`SELECT COALESCE(SUM(total_amount),0) as revenue
               FROM orders WHERE restaurant_id=$1 AND payment_status='paid'
               AND created_at::date = CURRENT_DATE`, [rid]),

        query(`SELECT COUNT(*) as count FROM orders
               WHERE restaurant_id=$1 AND created_at::date = CURRENT_DATE`, [rid]),

        query(`SELECT oi.name_snapshot as name, SUM(oi.quantity) as total_qty
               FROM order_items oi
               JOIN orders o ON o.id = oi.order_id
               WHERE o.restaurant_id=$1 AND o.created_at::date = CURRENT_DATE
               GROUP BY oi.name_snapshot ORDER BY total_qty DESC LIMIT 1`, [rid]),

        query(`SELECT COALESCE(AVG(total_amount),0) as avg
               FROM orders WHERE restaurant_id=$1 AND payment_status='paid'
               AND created_at >= NOW() - INTERVAL '30 days'`, [rid]),

        query(`SELECT order_status, COUNT(*) as count FROM orders
               WHERE restaurant_id=$1 GROUP BY order_status`, [rid]),

        query(`SELECT DATE(created_at) as date, SUM(total_amount) as revenue
               FROM orders WHERE restaurant_id=$1 AND payment_status='paid'
               AND created_at >= NOW() - INTERVAL '7 days'
               GROUP BY DATE(created_at) ORDER BY date`, [rid]),
      ]);

    res.json({
      revenue_today: parseFloat(revenueToday.rows[0].revenue),
      orders_today: parseInt(ordersToday.rows[0].count),
      top_dish: topDish.rows[0] || null,
      avg_order_value: parseFloat(avgOrder.rows[0].avg),
      orders_by_status: ordersToday.rows,
      revenue_last_7_days: revenueWeek.rows,
    });
  } catch (err) { next(err); }
}
