import { query } from '../db/pool.js';

// Plan limits configuration
const PLAN_LIMITS = {
  free: { menu_items: 20, categories: 5, staff: 2, tables: 10, media_mb: 100 },
  basic: { menu_items: 100, categories: 10, staff: 5, tables: 30, media_mb: 500 },
  pro: { menu_items: 500, categories: 20, staff: 15, tables: 100, media_mb: 2000 },
  premium: { menu_items: 999999, categories: 999999, staff: 999999, tables: 999999, media_mb: 10000 }
};

// GET /api/platform/health - Get restaurant health overview
export async function getRestaurantHealth(req, res, next) {
  try {
    const { threshold = 80, plan } = req.query;
    
    // Get current usage for all restaurants
    const result = await query(`
      SELECT 
        r.id,
        r.name,
        r.slug,
        r.subscription_plan,
        r.subscription_status,
        r.created_at,
        COALESCE(mi.count, 0) as menu_item_count,
        COALESCE(cat.count, 0) as category_count,
        COALESCE(staff.count, 0) as staff_count,
        COALESCE(tbl.count, 0) as table_count,
        COALESCE(media.size_mb, 0) as media_usage_mb
      FROM restaurants r
      LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM menu_items GROUP BY restaurant_id) mi ON mi.restaurant_id = r.id
      LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM categories GROUP BY restaurant_id) cat ON cat.restaurant_id = r.id
      LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM users WHERE role != 'customer' GROUP BY restaurant_id) staff ON staff.restaurant_id = r.id
      LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM tables GROUP BY restaurant_id) tbl ON tbl.restaurant_id = r.id
      LEFT JOIN (
        SELECT restaurant_id, COALESCE(SUM((metadata->>'size')::numeric / 1048576), 0) as size_mb 
        FROM menu_items 
        WHERE metadata->>'size' IS NOT NULL 
        GROUP BY restaurant_id
      ) media ON media.restaurant_id = r.id
      WHERE r.subscription_plan != 'free' OR r.subscription_status = 'active'
      ORDER BY r.created_at DESC
    `);
    
    // Calculate health scores
    const healthData = result.rows.map(row => {
      const limits = PLAN_LIMITS[row.subscription_plan] || PLAN_LIMITS.free;
      
      const menuItemPct = Math.min(100, (row.menu_item_count / limits.menu_items) * 100);
      const categoryPct = Math.min(100, (row.category_count / limits.categories) * 100);
      const staffPct = Math.min(100, (row.staff_count / limits.staff) * 100);
      const tablePct = Math.min(100, (row.table_count / limits.tables) * 100);
      const mediaPct = Math.min(100, (row.media_usage_mb / limits.media_mb) * 100);
      
      const warnings = [];
      if (menuItemPct >= 90) warnings.push({ type: 'critical', resource: 'menu_items', message: `Using ${Math.round(menuItemPct)}% of menu item limit` });
      else if (menuItemPct >= 75) warnings.push({ type: 'warning', resource: 'menu_items', message: `Using ${Math.round(menuItemPct)}% of menu item limit` });
      
      if (categoryPct >= 90) warnings.push({ type: 'critical', resource: 'categories', message: `Using ${Math.round(categoryPct)}% of category limit` });
      else if (categoryPct >= 75) warnings.push({ type: 'warning', resource: 'categories', message: `Using ${Math.round(categoryPct)}% of category limit` });
      
      if (staffPct >= 90) warnings.push({ type: 'critical', resource: 'staff', message: `Using ${Math.round(staffPct)}% of staff limit` });
      else if (staffPct >= 75) warnings.push({ type: 'warning', resource: 'staff', message: `Using ${Math.round(staffPct)}% of staff limit` });
      
      if (tablePct >= 90) warnings.push({ type: 'critical', resource: 'tables', message: `Using ${Math.round(tablePct)}% of table limit` });
      else if (tablePct >= 75) warnings.push({ type: 'warning', resource: 'tables', message: `Using ${Math.round(tablePct)}% of table limit` });
      
      if (mediaPct >= 90) warnings.push({ type: 'critical', resource: 'media', message: `Using ${Math.round(mediaPct)}% of media storage` });
      else if (mediaPct >= 75) warnings.push({ type: 'warning', resource: 'media', message: `Using ${Math.round(mediaPct)}% of media storage` });
      
      const healthScore = Math.max(0, 100 - (warnings.filter(w => w.type === 'critical').length * 20) - (warnings.filter(w => w.type === 'warning').length * 10));
      
      return {
        ...row,
        limits,
        usage: {
          menu_items: { count: row.menu_item_count, limit: limits.menu_items, pct: Math.round(menuItemPct) },
          categories: { count: row.category_count, limit: limits.categories, pct: Math.round(categoryPct) },
          staff: { count: row.staff_count, limit: limits.staff, pct: Math.round(staffPct) },
          tables: { count: row.table_count, limit: limits.tables, pct: Math.round(tablePct) },
          media: { count: Math.round(row.media_usage_mb), limit: limits.media_mb, pct: Math.round(mediaPct) }
        },
        warnings,
        health_score: healthScore,
        at_risk: healthScore < parseInt(threshold)
      };
    });
    
    // Filter by plan if specified
    let filtered = healthData;
    if (plan) {
      filtered = filtered.filter(h => h.subscription_plan === plan);
    }
    
    res.json(filtered);
  } catch (err) { next(err); }
}

// GET /api/platform/health/stats - Get health statistics
export async function getHealthStats(req, res, next) {
  try {
    // Get counts by health status
    const result = await query(`
      WITH health_calc AS (
        SELECT 
          r.id,
          r.subscription_plan,
          COALESCE(mi.count, 0) as menu_items,
          COALESCE(cat.count, 0) as categories,
          COALESCE(staff.count, 0) as staff,
          COALESCE(tbl.count, 0) as tables,
          CASE 
            WHEN r.subscription_plan = 'free' THEN 20
            WHEN r.subscription_plan = 'basic' THEN 100
            WHEN r.subscription_plan = 'pro' THEN 500
            ELSE 999999
          END as item_limit
        FROM restaurants r
        LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM menu_items GROUP BY restaurant_id) mi ON mi.restaurant_id = r.id
        LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM categories GROUP BY restaurant_id) cat ON cat.restaurant_id = r.id
        LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM users WHERE role != 'customer' GROUP BY restaurant_id) staff ON staff.restaurant_id = r.id
        LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM tables GROUP BY restaurant_id) tbl ON tbl.restaurant_id = r.id
      )
      SELECT 
        COUNT(*) as total_restaurants,
        COUNT(*) FILTER (WHERE (menu_items::float / NULLIF(item_limit, 0)) >= 0.9) as critical_count,
        COUNT(*) FILTER (WHERE (menu_items::float / NULLIF(item_limit, 0)) >= 0.75 AND (menu_items::float / NULLIF(item_limit, 0)) < 0.9) as warning_count,
        COUNT(*) FILTER (WHERE (menu_items::float / NULLIF(item_limit, 0)) < 0.75) as healthy_count,
        subscription_plan,
        COUNT(*) as plan_count
      FROM health_calc
      GROUP BY subscription_plan
    `);
    
    // At-risk restaurants (approaching limits)
    const atRiskResult = await query(`
      SELECT 
        r.id,
        r.name,
        r.slug,
        r.subscription_plan,
        COALESCE(mi.count, 0) as menu_items,
        CASE 
          WHEN r.subscription_plan = 'free' THEN 20
          WHEN r.subscription_plan = 'basic' THEN 100
          WHEN r.subscription_plan = 'pro' THEN 500
          ELSE 999999
        END as item_limit
      FROM restaurants r
      LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM menu_items GROUP BY restaurant_id) mi ON mi.restaurant_id = r.id
      WHERE (COALESCE(mi.count, 0)::float / 
        CASE 
          WHEN r.subscription_plan = 'free' THEN 20
          WHEN r.subscription_plan = 'basic' THEN 100
          WHEN r.subscription_plan = 'pro' THEN 500
          ELSE 999999
        END) >= 0.8
      ORDER BY (COALESCE(mi.count, 0)::float / 
        CASE 
          WHEN r.subscription_plan = 'free' THEN 20
          WHEN r.subscription_plan = 'basic' THEN 100
          WHEN r.subscription_plan = 'pro' THEN 500
          ELSE 999999
        END) DESC
      LIMIT 10
    `);
    
    res.json({
      by_plan: result.rows,
      at_risk: atRiskResult.rows
    });
  } catch (err) { next(err); }
}

// GET /api/platform/health/:restaurantId - Get detailed health for a restaurant
export async function getRestaurantHealthDetail(req, res, next) {
  try {
    const { restaurantId } = req.params;
    
    // Get restaurant info
    const restaurantResult = await query(`
      SELECT r.*, u.email as owner_email, u.name as owner_name
      FROM restaurants r
      LEFT JOIN users u ON u.restaurant_id = r.id AND u.role = 'restaurant_admin'
      WHERE r.id = $1
    `, [restaurantId]);
    
    if (!restaurantResult.rows[0]) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const restaurant = restaurantResult.rows[0];
    const limits = PLAN_LIMITS[restaurant.subscription_plan] || PLAN_LIMITS.free;
    
    // Get all usage metrics
    const usageResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM menu_items WHERE restaurant_id = $1) as menu_items,
        (SELECT COUNT(*) FROM categories WHERE restaurant_id = $1) as categories,
        (SELECT COUNT(*) FROM users WHERE restaurant_id = $1 AND role != 'customer') as staff,
        (SELECT COUNT(*) FROM tables WHERE restaurant_id = $1) as tables,
        (SELECT COALESCE(SUM((metadata->>'size')::numeric / 1048576), 0) FROM menu_items WHERE restaurant_id = $1 AND metadata->>'size' IS NOT NULL) as media_mb,
        (SELECT COUNT(*) FROM orders WHERE restaurant_id = $1 AND created_at >= NOW() - INTERVAL '30 days') as orders_30d,
        (SELECT COUNT(*) FROM orders WHERE restaurant_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as orders_7d
    `, [restaurantId]);
    
    const usage = usageResult.rows[0];
    
    // Calculate percentages
    const metrics = {
      menu_items: { used: parseInt(usage.menu_items), limit: limits.menu_items, pct: Math.round((usage.menu_items / limits.menu_items) * 100) },
      categories: { used: parseInt(usage.categories), limit: limits.categories, pct: Math.round((usage.categories / limits.categories) * 100) },
      staff: { used: parseInt(usage.staff), limit: limits.staff, pct: Math.round((usage.staff / limits.staff) * 100) },
      tables: { used: parseInt(usage.tables), limit: limits.tables, pct: Math.round((usage.tables / limits.tables) * 100) },
      media: { used: Math.round(usage.media_mb), limit: limits.media_mb, pct: Math.round((usage.media_mb / limits.media_mb) * 100) }
    };
    
    // Generate recommendations
    const recommendations = [];
    if (metrics.menu_items.pct >= 90) {
      recommendations.push({
        type: 'upgrade',
        priority: 'high',
        message: `Menu items at ${metrics.menu_items.pct}% capacity. Recommend upgrading to ${restaurant.subscription_plan === 'free' ? 'Basic' : restaurant.subscription_plan === 'basic' ? 'Pro' : 'Premium'}.`,
        current_plan: restaurant.subscription_plan,
        suggested_plan: restaurant.subscription_plan === 'free' ? 'basic' : restaurant.subscription_plan === 'basic' ? 'pro' : 'premium'
      });
    }
    if (metrics.staff.pct >= 90) {
      recommendations.push({
        type: 'upgrade',
        priority: 'high',
        message: `Staff limit at ${metrics.staff.pct}% capacity. Consider upgrading plan.`,
        current_plan: restaurant.subscription_plan,
        suggested_plan: restaurant.subscription_plan === 'free' ? 'basic' : 'pro'
      });
    }
    if (metrics.media.pct >= 80) {
      recommendations.push({
        type: 'cleanup',
        priority: 'medium',
        message: `Media storage at ${metrics.media.pct}%. Consider optimizing images or upgrading plan.`
      });
    }
    
    // Calculate health score
    const criticalCount = Object.values(metrics).filter(m => m.pct >= 90).length;
    const warningCount = Object.values(metrics).filter(m => m.pct >= 75 && m.pct < 90).length;
    const healthScore = Math.max(0, 100 - (criticalCount * 20) - (warningCount * 10));
    
    res.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        plan: restaurant.subscription_plan,
        owner: { name: restaurant.owner_name, email: restaurant.owner_email }
      },
      metrics,
      activity: {
        orders_30d: parseInt(usage.orders_30d),
        orders_7d: parseInt(usage.orders_7d)
      },
      recommendations,
      health_score: healthScore,
      status: healthScore >= 90 ? 'healthy' : healthScore >= 70 ? 'warning' : 'critical'
    });
  } catch (err) { next(err); }
}

// POST /api/platform/health/snapshot - Create health snapshot (for cron job)
export async function createHealthSnapshot(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all restaurants with usage
    const result = await query(`
      SELECT 
        r.id,
        r.subscription_plan,
        COALESCE(mi.count, 0) as menu_item_count,
        COALESCE(cat.count, 0) as category_count,
        COALESCE(staff.count, 0) as staff_count,
        COALESCE(tbl.count, 0) as table_count,
        COALESCE(media.size_mb, 0) as media_usage_mb
      FROM restaurants r
      LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM menu_items GROUP BY restaurant_id) mi ON mi.restaurant_id = r.id
      LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM categories GROUP BY restaurant_id) cat ON cat.restaurant_id = r.id
      LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM users WHERE role != 'customer' GROUP BY restaurant_id) staff ON staff.restaurant_id = r.id
      LEFT JOIN (SELECT restaurant_id, COUNT(*) as count FROM tables GROUP BY restaurant_id) tbl ON tbl.restaurant_id = r.id
      LEFT JOIN (
        SELECT restaurant_id, COALESCE(SUM((metadata->>'size')::numeric / 1048576), 0) as size_mb 
        FROM menu_items 
        WHERE metadata->>'size' IS NOT NULL 
        GROUP BY restaurant_id
      ) media ON media.restaurant_id = r.id
    `);
    
    const snapshots = [];
    
    for (const row of result.rows) {
      const limits = PLAN_LIMITS[row.subscription_plan] || PLAN_LIMITS.free;
      
      const menuItemPct = Math.min(100, (row.menu_item_count / limits.menu_items) * 100);
      const categoryPct = Math.min(100, (row.category_count / limits.categories) * 100);
      const staffPct = Math.min(100, (row.staff_count / limits.staff) * 100);
      const tablePct = Math.min(100, (row.table_count / limits.tables) * 100);
      const mediaPct = Math.min(100, (row.media_usage_mb / limits.media_mb) * 100);
      
      const warnings = [];
      if (menuItemPct >= 90) warnings.push('menu_items_critical');
      else if (menuItemPct >= 75) warnings.push('menu_items_warning');
      if (categoryPct >= 90) warnings.push('categories_critical');
      else if (categoryPct >= 75) warnings.push('categories_warning');
      if (staffPct >= 90) warnings.push('staff_critical');
      else if (staffPct >= 75) warnings.push('staff_warning');
      if (tablePct >= 90) warnings.push('tables_critical');
      else if (tablePct >= 75) warnings.push('tables_warning');
      if (mediaPct >= 90) warnings.push('media_critical');
      else if (mediaPct >= 75) warnings.push('media_warning');
      
      const healthScore = Math.max(0, 100 - (warnings.filter(w => w.includes('critical')).length * 20) - (warnings.filter(w => w.includes('warning')).length * 10));
      
      snapshots.push({
        restaurant_id: row.id,
        menu_item_count: row.menu_item_count,
        menu_item_limit: limits.menu_items,
        menu_item_usage_pct: menuItemPct,
        category_count: row.category_count,
        category_limit: limits.categories,
        category_usage_pct: categoryPct,
        staff_count: row.staff_count,
        staff_limit: limits.staff,
        staff_usage_pct: staffPct,
        table_count: row.table_count,
        table_limit: limits.tables,
        table_usage_pct: tablePct,
        media_usage_mb: row.media_usage_mb,
        media_limit_mb: limits.media_mb,
        media_usage_pct: mediaPct,
        overall_health_score: healthScore,
        warnings: JSON.stringify(warnings)
      });
    }
    
    // Insert snapshots
    for (const snap of snapshots) {
      await query(`
        INSERT INTO restaurant_health_snapshots (
          restaurant_id, snapshot_date, menu_item_count, menu_item_limit, menu_item_usage_pct,
          category_count, category_limit, category_usage_pct, staff_count, staff_limit, staff_usage_pct,
          table_count, table_limit, table_usage_pct, media_usage_mb, media_limit_mb, media_usage_pct,
          overall_health_score, warnings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT DO NOTHING
      `, [
        snap.restaurant_id, today, snap.menu_item_count, snap.menu_item_limit, snap.menu_item_usage_pct,
        snap.category_count, snap.category_limit, snap.category_usage_pct, snap.staff_count, snap.staff_limit, snap.staff_usage_pct,
        snap.table_count, snap.table_limit, snap.table_usage_pct, snap.media_usage_mb, snap.media_limit_mb, snap.media_usage_pct,
        snap.overall_health_score, snap.warnings
      ]);
    }
    
    res.json({ created: snapshots.length });
  } catch (err) { next(err); }
}
