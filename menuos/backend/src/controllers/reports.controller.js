import { query } from '../db/pool.js';

// GET /api/restaurants/:slug/reports/summary
export async function getReportSummary(req, res, next) {
  try {
    const restaurantId = req.tenant.id;

    // Today's stats
    const todayStats = await query(`
      SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_revenue,
        COALESCE(SUM(discount_amount), 0) as total_discounts
      FROM orders 
      WHERE restaurant_id = $1 AND created_at::date = CURRENT_DATE
    `, [restaurantId]);

    // This month stats
    const monthStats = await query(`
      SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_revenue,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COUNT(DISTINCT mobile_number) as unique_customers
      FROM orders 
      WHERE restaurant_id = $1 
        AND created_at >= date_trunc('month', CURRENT_DATE)
    `, [restaurantId]);

    // This year stats
    const yearStats = await query(`
      SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COUNT(DISTINCT mobile_number) as unique_customers
      FROM orders 
      WHERE restaurant_id = $1 
        AND created_at >= date_trunc('year', CURRENT_DATE)
    `, [restaurantId]);

    // Top selling items this month
    const topItems = await query(`
      SELECT 
        oi.name_snapshot as name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price_snapshot) as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.restaurant_id = $1 
        AND o.created_at >= date_trunc('month', CURRENT_DATE)
        AND o.order_status != 'cancelled'
      GROUP BY oi.name_snapshot
      ORDER BY total_quantity DESC
      LIMIT 10
    `, [restaurantId]);

    // Order status breakdown
    const statusBreakdown = await query(`
      SELECT 
        order_status,
        COUNT(*) as count
      FROM orders 
      WHERE restaurant_id = $1 
        AND created_at >= date_trunc('month', CURRENT_DATE)
      GROUP BY order_status
    `, [restaurantId]);

    res.json({
      today: todayStats.rows[0],
      thisMonth: monthStats.rows[0],
      thisYear: yearStats.rows[0],
      topItems: topItems.rows,
      statusBreakdown: statusBreakdown.rows,
    });
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/reports/daily
export async function getDailyReport(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { date = new Date().toISOString().split('T')[0], days = 7 } = req.query;

    // Daily breakdown for last N days
    const dailyBreakdown = await query(`
      SELECT 
        created_at::date as date,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(discount_amount), 0) as discounts,
        COUNT(DISTINCT mobile_number) as customers,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE restaurant_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
        AND order_status != 'cancelled'
      GROUP BY created_at::date
      ORDER BY date DESC
    `, [restaurantId]);

    // Hourly breakdown for the specified date
    const hourlyBreakdown = await query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders 
      WHERE restaurant_id = $1 
        AND created_at::date = $2
        AND order_status != 'cancelled'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `, [restaurantId, date]);

    // Items sold on the specified date
    const itemsSold = await query(`
      SELECT 
        oi.name_snapshot as name,
        oi.price_snapshot as price,
        SUM(oi.quantity) as quantity,
        SUM(oi.quantity * oi.price_snapshot) as total
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.restaurant_id = $1 
        AND o.created_at::date = $2
        AND o.order_status != 'cancelled'
      GROUP BY oi.name_snapshot, oi.price_snapshot
      ORDER BY quantity DESC
    `, [restaurantId, date]);

    res.json({
      dailyBreakdown: dailyBreakdown.rows,
      hourlyBreakdown: hourlyBreakdown.rows,
      itemsSold: itemsSold.rows,
      date,
    });
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/reports/monthly
export async function getMonthlyReport(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { months = 12 } = req.query;

    // Monthly breakdown
    const monthlyBreakdown = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        TO_CHAR(created_at, 'Mon YYYY') as month_name,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(discount_amount), 0) as discounts,
        COUNT(DISTINCT mobile_number) as customers,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE restaurant_id = $1 
        AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '${parseInt(months) - 1} months')
        AND order_status != 'cancelled'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM'), TO_CHAR(created_at, 'Mon YYYY')
      ORDER BY month DESC
    `, [restaurantId]);

    // Category breakdown this month
    const categoryBreakdown = await query(`
      SELECT 
        m.category,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as items_sold,
        SUM(oi.quantity * oi.price_snapshot) as revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN menu_items m ON m.id = oi.menu_item_id
      WHERE o.restaurant_id = $1 
        AND o.created_at >= date_trunc('month', CURRENT_DATE)
        AND o.order_status != 'cancelled'
      GROUP BY m.category
      ORDER BY revenue DESC
    `, [restaurantId]);

    // Payment status breakdown
    const paymentBreakdown = await query(`
      SELECT 
        payment_status,
        COUNT(*) as count,
        SUM(total_amount) as amount
      FROM orders 
      WHERE restaurant_id = $1 
        AND created_at >= date_trunc('month', CURRENT_DATE)
      GROUP BY payment_status
    `, [restaurantId]);

    res.json({
      monthlyBreakdown: monthlyBreakdown.rows,
      categoryBreakdown: categoryBreakdown.rows,
      paymentBreakdown: paymentBreakdown.rows,
    });
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/reports/export
export async function exportReport(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { type = 'orders', start_date, end_date, format = 'csv' } = req.query;

    let data = [];
    let filename = '';
    let headers = [];

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    switch (type) {
      case 'orders':
        filename = `orders_${startDate}_to_${endDate}`;
        headers = ['Order Number', 'Date', 'Table', 'Mobile', 'Items', 'Subtotal', 'Discount', 'Total', 'Status', 'Payment'];
        
        const ordersResult = await query(`
          SELECT 
            o.order_number,
            TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI') as date,
            o.table_number,
            o.mobile_number,
            COUNT(oi.id) as items,
            o.subtotal,
            COALESCE(o.discount_amount, 0) as discount,
            o.total_amount,
            o.order_status,
            o.payment_status
          FROM orders o
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.restaurant_id = $1 
            AND o.created_at::date BETWEEN $2 AND $3
          GROUP BY o.id
          ORDER BY o.created_at DESC
        `, [restaurantId, startDate, endDate]);
        
        data = ordersResult.rows.map(r => [
          r.order_number,
          r.date,
          r.table_number,
          r.mobile_number,
          r.items,
          r.subtotal || r.total_amount,
          r.discount,
          r.total_amount,
          r.order_status,
          r.payment_status
        ]);
        break;

      case 'items':
        filename = `items_${startDate}_to_${endDate}`;
        headers = ['Item Name', 'Category', 'Quantity Sold', 'Revenue', 'Avg Price'];
        
        const itemsResult = await query(`
          SELECT 
            oi.name_snapshot as name,
            m.category,
            SUM(oi.quantity) as quantity,
            SUM(oi.quantity * oi.price_snapshot) as revenue,
            AVG(oi.price_snapshot) as avg_price
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          LEFT JOIN menu_items m ON m.id = oi.menu_item_id
          WHERE o.restaurant_id = $1 
            AND o.created_at::date BETWEEN $2 AND $3
            AND o.order_status != 'cancelled'
          GROUP BY oi.name_snapshot, m.category
          ORDER BY revenue DESC
        `, [restaurantId, startDate, endDate]);
        
        data = itemsResult.rows.map(r => [
          r.name,
          r.category || 'N/A',
          r.quantity,
          parseFloat(r.revenue).toFixed(2),
          parseFloat(r.avg_price).toFixed(2)
        ]);
        break;

      case 'daily':
        filename = `daily_summary_${startDate}_to_${endDate}`;
        headers = ['Date', 'Orders', 'Revenue', 'Discounts', 'Customers', 'Avg Order'];
        
        const dailyResult = await query(`
          SELECT 
            created_at::date as date,
            COUNT(*) as orders,
            SUM(total_amount) as revenue,
            SUM(COALESCE(discount_amount, 0)) as discounts,
            COUNT(DISTINCT mobile_number) as customers,
            AVG(total_amount) as avg_order
          FROM orders 
          WHERE restaurant_id = $1 
            AND created_at::date BETWEEN $2 AND $3
            AND order_status != 'cancelled'
          GROUP BY created_at::date
          ORDER BY date DESC
        `, [restaurantId, startDate, endDate]);
        
        data = dailyResult.rows.map(r => [
          r.date.toISOString().split('T')[0],
          r.orders,
          parseFloat(r.revenue).toFixed(2),
          parseFloat(r.discounts).toFixed(2),
          r.customers,
          parseFloat(r.avg_order).toFixed(2)
        ]);
        break;

      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    // Generate CSV
    if (format === 'csv') {
      const csv = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      res.json({ headers, data });
    }
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/reports/items
export async function getItemReport(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { period = 'month' } = req.query;

    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "AND created_at::date = CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND created_at >= date_trunc('month', CURRENT_DATE)";
        break;
      case 'year':
        dateFilter = "AND created_at >= date_trunc('year', CURRENT_DATE)";
        break;
      default:
        dateFilter = "AND created_at >= date_trunc('month', CURRENT_DATE)";
    }

    const result = await query(`
      SELECT 
        oi.name_snapshot as name,
        m.category,
        m.price as current_price,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price_snapshot) as total_revenue,
        COUNT(DISTINCT o.id) as order_count,
        ROUND(AVG(oi.quantity)::numeric, 2) as avg_quantity_per_order
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN menu_items m ON m.id = oi.menu_item_id
      WHERE o.restaurant_id = $1 
        ${dateFilter}
        AND o.order_status != 'cancelled'
      GROUP BY oi.name_snapshot, m.category, m.price
      ORDER BY total_quantity DESC
    `, [restaurantId]);

    res.json(result.rows);
  } catch (err) { next(err); }
}
