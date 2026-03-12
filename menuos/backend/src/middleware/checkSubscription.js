import { query } from '../db/pool.js';

export const PLAN_LIMITS = {
  free:   { menu_items: 20,  orders_per_month: 50,   tables: 3,  staff: 1 },
  basic:  { menu_items: Infinity, orders_per_month: Infinity, tables: Infinity, staff: 5 },  // Admin 1 + Cashier 1 + Chef 1 + Waiter 2
  pro:    { menu_items: Infinity, orders_per_month: Infinity, tables: Infinity, staff: 5 },  // + 25 item photos included
  premium:{ menu_items: Infinity, orders_per_month: Infinity, tables: Infinity, staff: 5 },  // + AI Assistant
};

export const PLAN_PRICING = {
  free:    { monthly: 0,    setup: 0,    description: 'Limited features for trial' },
  basic:   { monthly: 1500, setup: 4000, description: 'Unlimited items, orders, tables. Staff: 5 (Admin, Cashier, Chef, 2 Waiters)' },
  pro:     { monthly: 2500, setup: 4000, description: 'Basic + 25 item photos (Rs. 300/additional item)' },
  premium: { monthly: 5000, setup: 4000, description: 'Pro + AI Assistant for customers' },
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
