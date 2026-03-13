import { query } from '../db/pool.js';

// Log an activity
export async function logActivity(data) {
  try {
    const { user_id, user_name, user_role, restaurant_id, restaurant_name, action, entity_type, entity_id, details, ip_address } = data;
    await query(
      `INSERT INTO activity_logs (user_id, user_name, user_role, restaurant_id, restaurant_name, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [user_id, user_name, user_role, restaurant_id, restaurant_name, action, entity_type, entity_id, JSON.stringify(details), ip_address]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// GET /api/platform/activity-logs
export async function getActivityLogs(req, res, next) {
  try {
    const { limit = 100, offset = 0, action, restaurant_id, user_id } = req.query;
    
    let sql = `
      SELECT al.*, 
             r.name as restaurant_name,
             u.name as user_name
      FROM activity_logs al
      LEFT JOIN restaurants r ON al.restaurant_id = r.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (action) {
      sql += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }
    if (restaurant_id) {
      sql += ` AND al.restaurant_id = $${paramIndex++}`;
      params.push(restaurant_id);
    }
    if (user_id) {
      sql += ` AND al.user_id = $${paramIndex++}`;
      params.push(user_id);
    }

    sql += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/platform/activity-logs/summary
export async function getActivitySummary(req, res, next) {
  try {
    // Activity by action type (last 30 days)
    const byAction = await query(`
      SELECT action, COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY action
      ORDER BY count DESC
    `);

    // Activity by day (last 14 days)
    const byDay = await query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Recent login activity
    const recentLogins = await query(`
      SELECT al.*, r.name as restaurant_name
      FROM activity_logs al
      LEFT JOIN restaurants r ON al.restaurant_id = r.id
      WHERE al.action = 'login'
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    res.json({
      by_action: byAction.rows,
      by_day: byDay.rows,
      recent_logins: recentLogins.rows
    });
  } catch (err) { next(err); }
}
