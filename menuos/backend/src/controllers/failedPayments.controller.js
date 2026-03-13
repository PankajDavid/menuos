import { query } from '../db/pool.js';

// GET /api/platform/failed-payments - Get all failed payments
export async function getFailedPayments(req, res, next) {
  try {
    const { status, days } = req.query;
    
    let sql = `
      SELECT 
        fp.*,
        r.name as restaurant_name,
        r.slug as restaurant_slug,
        r.email as restaurant_email,
        u.name as resolved_by_name
      FROM failed_payments fp
      JOIN restaurants r ON fp.restaurant_id = r.id
      LEFT JOIN users u ON fp.resolved_by = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      sql += ` AND fp.status = $${params.length}`;
    }
    
    if (days) {
      params.push(parseInt(days));
      sql += ` AND fp.created_at >= NOW() - INTERVAL '${days} days'`;
    }
    
    sql += ` ORDER BY fp.created_at DESC`;
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/platform/failed-payments/stats - Get failed payment statistics
export async function getFailedPaymentStats(req, res, next) {
  try {
    const { days = 30 } = req.query;
    
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'dunning') as dunning_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) as total_failed,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'dunning'), 0) as dunning_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'resolved'), 0) as recovered_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'cancelled'), 0) as lost_amount
      FROM failed_payments
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `);
    
    // Top failure reasons
    const reasonsResult = await query(`
      SELECT 
        failure_reason,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM failed_payments
      WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND failure_reason IS NOT NULL
      GROUP BY failure_reason
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Failure rate by plan
    const planResult = await query(`
      SELECT 
        plan,
        COUNT(*) as failed_count,
        (SELECT COUNT(*) FROM revenue_events 
         WHERE event_type = 'payment_succeeded' 
         AND new_plan = failed_payments.plan
         AND created_at >= NOW() - INTERVAL '${days} days') as success_count
      FROM failed_payments
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY plan
    `);
    
    // Recovery rate
    const stats = result.rows[0];
    const recoveryRate = stats.total_failed > 0 
      ? ((parseInt(stats.resolved_count) / parseInt(stats.total_failed)) * 100).toFixed(1)
      : 0;
    
    res.json({
      ...stats,
      recovery_rate: parseFloat(recoveryRate),
      period_days: parseInt(days),
      top_failure_reasons: reasonsResult.rows,
      by_plan: planResult.rows
    });
  } catch (err) { next(err); }
}

// POST /api/platform/failed-payments - Record a failed payment
export async function recordFailedPayment(req, res, next) {
  try {
    const { restaurant_id, amount, plan, failure_reason, error_code } = req.body;
    
    if (!restaurant_id || !amount || !plan) {
      return res.status(400).json({ error: 'Restaurant, amount, and plan are required' });
    }
    
    // Calculate next retry time (24 hours from now)
    const nextRetry = new Date();
    nextRetry.setHours(nextRetry.getHours() + 24);
    
    const result = await query(`
      INSERT INTO failed_payments (restaurant_id, amount, plan, failure_reason, error_code, next_retry_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [restaurant_id, amount, plan, failure_reason || null, error_code || null, nextRetry]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/platform/failed-payments/:id/retry - Retry a failed payment
export async function retryFailedPayment(req, res, next) {
  try {
    const { id } = req.params;
    
    // Get current failed payment
    const currentResult = await query(
      'SELECT * FROM failed_payments WHERE id = $1',
      [id]
    );
    
    if (!currentResult.rows[0]) {
      return res.status(404).json({ error: 'Failed payment not found' });
    }
    
    const fp = currentResult.rows[0];
    
    if (fp.retry_count >= fp.max_retries) {
      return res.status(400).json({ error: 'Maximum retries exceeded' });
    }
    
    // Calculate next retry
    const nextRetry = new Date();
    nextRetry.setHours(nextRetry.getHours() + 24 * (fp.retry_count + 1));
    
    const result = await query(`
      UPDATE failed_payments 
      SET retry_count = retry_count + 1, 
          next_retry_at = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [nextRetry, id]);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/platform/failed-payments/:id/resolve - Mark as resolved
export async function resolveFailedPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const resolvedBy = req.user.id;
    
    const result = await query(`
      UPDATE failed_payments 
      SET status = 'resolved',
          resolved_at = NOW(),
          resolved_by = $1,
          resolution_notes = $2,
          updated_at = NOW()
      WHERE id = $3 AND status IN ('pending', 'dunning')
      RETURNING *
    `, [resolvedBy, notes || null, id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Pending failed payment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/platform/failed-payments/:id/cancel - Cancel and downgrade
export async function cancelFailedPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const resolvedBy = req.user.id;
    
    // Get failed payment details
    const fpResult = await query(
      'SELECT * FROM failed_payments WHERE id = $1',
      [id]
    );
    
    if (!fpResult.rows[0]) {
      return res.status(404).json({ error: 'Failed payment not found' });
    }
    
    const fp = fpResult.rows[0];
    
    // Update failed payment
    await query(`
      UPDATE failed_payments 
      SET status = 'cancelled',
          resolved_at = NOW(),
          resolved_by = $1,
          resolution_notes = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [resolvedBy, notes || 'Downgraded to free plan due to payment failure', id]);
    
    // Downgrade restaurant to free
    await query(`
      UPDATE restaurants 
      SET subscription_plan = 'free',
          subscription_status = 'inactive',
          updated_at = NOW()
      WHERE id = $1
    `, [fp.restaurant_id]);
    
    res.json({ message: 'Payment cancelled and restaurant downgraded to free' });
  } catch (err) { next(err); }
}

// POST /api/platform/failed-payments/:id/dunning - Move to dunning
export async function moveToDunning(req, res, next) {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE failed_payments 
      SET status = 'dunning',
          updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `, [id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Pending failed payment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/platform/failed-payments/dunning-report - Get dunning report
export async function getDunningReport(req, res, next) {
  try {
    const result = await query(`
      SELECT 
        fp.*,
        r.name as restaurant_name,
        r.slug as restaurant_slug,
        r.email as restaurant_email,
        DATE_PART('day', NOW() - fp.created_at) as days_in_dunning
      FROM failed_payments fp
      JOIN restaurants r ON fp.restaurant_id = r.id
      WHERE fp.status = 'dunning'
      ORDER BY fp.created_at ASC
    `);
    
    // Summary
    const summaryResult = await query(`
      SELECT 
        COUNT(*) as total_in_dunning,
        COALESCE(SUM(amount), 0) as total_at_risk,
        AVG(DATE_PART('day', NOW() - created_at)) as avg_days_in_dunning
      FROM failed_payments
      WHERE status = 'dunning'
    `);
    
    res.json({
      dunning_payments: result.rows,
      summary: summaryResult.rows[0]
    });
  } catch (err) { next(err); }
}
