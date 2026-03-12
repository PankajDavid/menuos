import { query } from '../db/pool.js';

export const PLAN_LIMITS = {
  free:    { menu_items: 20,  orders_per_month: 50,   tables: 3,  staff: 1, photos: 0, videos: 0 },
  basic:   { menu_items: Infinity, orders_per_month: Infinity, tables: Infinity, staff: 5, photos: Infinity, videos: 0 },  // Photos unlimited, no videos
  pro:     { menu_items: Infinity, orders_per_month: Infinity, tables: Infinity, staff: 5, photos: Infinity, videos: 25 },  // 25 videos included
  premium: { menu_items: Infinity, orders_per_month: Infinity, tables: Infinity, staff: 5, photos: Infinity, videos: 25 },  // Same as Pro + AI Assistant
};

export const PLAN_PRICING = {
  free:    { monthly: 0,    setup: 0,    description: 'Limited features for trial' },
  basic:   { monthly: 1500, setup: 4000, description: 'Unlimited items, orders, tables, photos. Staff: 5. No videos.' },
  pro:     { monthly: 2500, setup: 4000, description: 'Basic + 25 item videos (10 sec each). Rs. 300 per additional video.' },
  premium: { monthly: 5000, setup: 4000, description: 'Pro + AI Assistant for customers. Same 25 videos + Rs. 300 per additional.' },
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
