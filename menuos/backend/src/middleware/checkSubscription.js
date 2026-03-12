import { query } from '../db/pool.js';

export const PLAN_LIMITS = {
  free:  { menu_items: 100,      orders_per_month: 500,  tables: 10, staff: 2 },
  basic: { menu_items: Infinity, orders_per_month: 1000, tables: 25, staff: 3 },
  pro:   { menu_items: Infinity, orders_per_month: Infinity, tables: Infinity, staff: Infinity },
};

export function checkMenuItemLimit(req, res, next) {
  return _checkLimit(req, res, next, async (tenant) => {
    const result = await query(
      'SELECT COUNT(*) FROM menu_items WHERE restaurant_id = $1',
      [tenant.id]
    );
    return { current: parseInt(result.rows[0].count), max: PLAN_LIMITS[tenant.subscription_plan].menu_items, resource: 'menu items' };
  });
}

export function checkOrderLimit(req, res, next) {
  return _checkLimit(req, res, next, async (tenant) => {
    const result = await query(
      `SELECT COUNT(*) FROM orders
       WHERE restaurant_id = $1
       AND created_at >= date_trunc('month', NOW())`,
      [tenant.id]
    );
    return { current: parseInt(result.rows[0].count), max: PLAN_LIMITS[tenant.subscription_plan].orders_per_month, resource: 'orders this month' };
  });
}

async function _checkLimit(req, res, next, getUsage) {
  if (!req.tenant) return next();
  try {
    const { current, max, resource } = await getUsage(req.tenant);
    if (current >= max) {
      return res.status(403).json({
        error: `Plan limit reached: ${current}/${max} ${resource}. Please upgrade your plan.`,
        code: 'PLAN_LIMIT_EXCEEDED',
        plan: req.tenant.subscription_plan,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}
