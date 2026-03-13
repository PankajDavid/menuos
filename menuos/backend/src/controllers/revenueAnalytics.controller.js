import { query } from '../db/pool.js';

// Plan prices (monthly in INR)
const PLAN_PRICES = {
  free: 0,
  basic: 999,
  pro: 2499,
  premium: 4999
};

// GET /api/platform/revenue/analytics - Get revenue analytics
export async function getRevenueAnalytics(req, res, next) {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    // Current MRR
    const mrrResult = await query(`
      SELECT 
        subscription_plan,
        COUNT(*) as customer_count
      FROM restaurants
      WHERE subscription_plan != 'free'
      GROUP BY subscription_plan
    `);
    
    let currentMrr = 0;
    const byPlan = {};
    mrrResult.rows.forEach(row => {
      const price = PLAN_PRICES[row.subscription_plan] || 0;
      const planMrr = price * row.customer_count;
      currentMrr += planMrr;
      byPlan[row.subscription_plan] = {
        customers: row.customer_count,
        mrr: planMrr
      };
    });
    
    // Revenue events in period
    const eventsResult = await query(`
      SELECT 
        event_type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM revenue_events
      WHERE event_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY event_type
    `);
    
    const events = {};
    eventsResult.rows.forEach(row => {
      events[row.event_type] = {
        count: parseInt(row.count),
        amount: parseFloat(row.total_amount)
      };
    });
    
    // Upgrade/downgrade trends
    const trendsResult = await query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        event_type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount
      FROM revenue_events
      WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND event_type IN ('subscription_upgraded', 'subscription_downgraded', 'subscription_started', 'subscription_cancelled')
      GROUP BY DATE_TRUNC('day', created_at), event_type
      ORDER BY date DESC
    `);
    
    // Churn calculation
    const churnResult = await query(`
      SELECT 
        COUNT(DISTINCT restaurant_id) FILTER (WHERE event_type = 'subscription_cancelled') as churned,
        COUNT(DISTINCT restaurant_id) FILTER (WHERE event_type = 'subscription_started' AND created_at >= NOW() - INTERVAL '${days} days') as new_customers,
        (SELECT COUNT(*) FROM restaurants WHERE subscription_plan != 'free') as total_paid_customers
      FROM revenue_events
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `);
    
    const churnData = churnResult.rows[0];
    const churnRate = churnData.total_paid_customers > 0 
      ? (parseInt(churnData.churned) / parseInt(churnData.total_paid_customers) * 100).toFixed(2)
      : 0;
    
    // ARPU (Average Revenue Per User)
    const paidCustomers = Object.values(byPlan).reduce((a, p) => a + p.customers, 0);
    const arpu = paidCustomers > 0 ? (currentMrr / paidCustomers).toFixed(2) : 0;
    
    res.json({
      current_mrr: currentMrr,
      by_plan: byPlan,
      arpu: parseFloat(arpu),
      churn_rate: parseFloat(churnRate),
      period_days: days,
      events,
      trends: trendsResult.rows,
      summary: {
        total_paid_customers: paidCustomers,
        new_customers: parseInt(churnData.new_customers) || 0,
        churned_customers: parseInt(churnData.churned) || 0
      }
    });
  } catch (err) { next(err); }
}

// GET /api/platform/revenue/mrr-history - Get MRR history
export async function getMrrHistory(req, res, next) {
  try {
    const { months = 6 } = req.query;
    
    const result = await query(`
      SELECT 
        snapshot_date,
        total_mrr,
        total_customers,
        new_customers,
        churned_customers,
        upgrades,
        downgrades,
        by_plan
      FROM mrr_snapshots
      WHERE snapshot_date >= CURRENT_DATE - INTERVAL '${months} months'
      ORDER BY snapshot_date ASC
    `);
    
    // If no snapshots exist, generate from current data
    if (result.rows.length === 0) {
      // Generate daily MRR for the period
      const dailyResult = await query(`
        WITH dates AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '${months} months',
            CURRENT_DATE,
            '1 day'::interval
          )::date as date
        )
        SELECT 
          d.date,
          COALESCE(SUM(
            CASE r.subscription_plan
              WHEN 'basic' THEN 999
              WHEN 'pro' THEN 2499
              WHEN 'premium' THEN 4999
              ELSE 0
            END
          ), 0) as mrr,
          COUNT(r.id) FILTER (WHERE r.subscription_plan != 'free') as customers
        FROM dates d
        LEFT JOIN restaurants r ON r.created_at::date <= d.date 
          AND (r.subscription_plan != 'free' OR r.created_at::date = d.date)
        GROUP BY d.date
        ORDER BY d.date
      `);
      
      return res.json(dailyResult.rows);
    }
    
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/platform/revenue/upgrades - Get upgrade/downgrade analysis
export async function getUpgradeAnalysis(req, res, next) {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    // Upgrade paths
    const upgradesResult = await query(`
      SELECT 
        previous_plan,
        new_plan,
        COUNT(*) as count,
        AVG(amount) as avg_amount
      FROM revenue_events
      WHERE event_type = 'subscription_upgraded'
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY previous_plan, new_plan
      ORDER BY count DESC
    `);
    
    // Downgrade paths
    const downgradesResult = await query(`
      SELECT 
        previous_plan,
        new_plan,
        COUNT(*) as count
      FROM revenue_events
      WHERE event_type = 'subscription_downgraded'
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY previous_plan, new_plan
      ORDER BY count DESC
    `);
    
    // Most common upgrade path
    const mostCommonUpgrade = upgradesResult.rows[0] || null;
    
    // Revenue impact of upgrades
    const upgradeRevenueResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM revenue_events
      WHERE event_type = 'subscription_upgraded'
        AND created_at >= NOW() - INTERVAL '${days} days'
    `);
    
    // Revenue loss from downgrades
    const downgradeLossResult = await query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN previous_plan = 'premium' AND new_plan = 'pro' THEN 2500
          WHEN previous_plan = 'premium' AND new_plan = 'basic' THEN 4000
          WHEN previous_plan = 'pro' AND new_plan = 'basic' THEN 1500
          ELSE 0
        END
      ), 0) as estimated_loss
      FROM revenue_events
      WHERE event_type = 'subscription_downgraded'
        AND created_at >= NOW() - INTERVAL '${days} days'
    `);
    
    res.json({
      upgrades: upgradesResult.rows,
      downgrades: downgradesResult.rows,
      most_common_upgrade: mostCommonUpgrade,
      upgrade_revenue: parseFloat(upgradeRevenueResult.rows[0]?.total || 0),
      downgrade_loss: parseFloat(downgradeLossResult.rows[0]?.estimated_loss || 0),
      net_revenue_impact: parseFloat(upgradeRevenueResult.rows[0]?.total || 0) - parseFloat(downgradeLossResult.rows[0]?.estimated_loss || 0)
    });
  } catch (err) { next(err); }
}

// POST /api/platform/revenue/events - Record revenue event
export async function recordRevenueEvent(req, res, next) {
  try {
    const { restaurant_id, event_type, previous_plan, new_plan, amount, metadata } = req.body;
    
    if (!restaurant_id || !event_type) {
      return res.status(400).json({ error: 'Restaurant ID and event type are required' });
    }
    
    const result = await query(`
      INSERT INTO revenue_events (restaurant_id, event_type, previous_plan, new_plan, amount, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [restaurant_id, event_type, previous_plan || null, new_plan || null, amount || null, metadata ? JSON.stringify(metadata) : null]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/platform/revenue/snapshot - Create MRR snapshot (for cron job)
export async function createMrrSnapshot(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate current stats
    const statsResult = await query(`
      SELECT 
        subscription_plan,
        COUNT(*) as count
      FROM restaurants
      WHERE subscription_plan != 'free'
      GROUP BY subscription_plan
    `);
    
    let totalMrr = 0;
    const byPlan = {};
    let totalCustomers = 0;
    
    statsResult.rows.forEach(row => {
      const price = PLAN_PRICES[row.subscription_plan] || 0;
      const planMrr = price * row.count;
      totalMrr += planMrr;
      totalCustomers += row.count;
      byPlan[row.subscription_plan] = {
        customers: row.count,
        mrr: planMrr
      };
    });
    
    // Get new/churned from today
    const todayEventsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE event_type = 'subscription_started') as new_customers,
        COUNT(*) FILTER (WHERE event_type = 'subscription_cancelled') as churned,
        COUNT(*) FILTER (WHERE event_type = 'subscription_upgraded') as upgrades,
        COUNT(*) FILTER (WHERE event_type = 'subscription_downgraded') as downgrades
      FROM revenue_events
      WHERE event_date = CURRENT_DATE
    `);
    
    const todayEvents = todayEventsResult.rows[0];
    
    // Insert or update snapshot
    await query(`
      INSERT INTO mrr_snapshots (snapshot_date, total_mrr, total_customers, new_customers, churned_customers, upgrades, downgrades, by_plan)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (snapshot_date)
      DO UPDATE SET 
        total_mrr = $2,
        total_customers = $3,
        new_customers = $4,
        churned_customers = $5,
        upgrades = $6,
        downgrades = $7,
        by_plan = $8,
        updated_at = NOW()
    `, [
      today,
      totalMrr,
      totalCustomers,
      todayEvents.new_customers || 0,
      todayEvents.churned || 0,
      todayEvents.upgrades || 0,
      todayEvents.downgrades || 0,
      JSON.stringify(byPlan)
    ]);
    
    res.json({
      snapshot_date: today,
      total_mrr: totalMrr,
      total_customers: totalCustomers,
      by_plan: byPlan
    });
  } catch (err) { next(err); }
}
