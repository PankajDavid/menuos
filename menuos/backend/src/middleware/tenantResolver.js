import { query } from '../db/pool.js';

export async function tenantResolver(req, res, next) {
  const slug = req.params.slug;
  if (!slug) return next();

  try {
    const result = await query(
      'SELECT * FROM restaurants WHERE slug = $1 AND is_active = TRUE',
      [slug]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    req.tenant = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

// Ensure authenticated user belongs to this restaurant (or is platform admin)
export function requireTenantAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role === 'platform_admin') return next();
  // JWT payload uses restaurantId, not restaurant_id
  const userRestaurantId = req.user.restaurantId || req.user.restaurant_id;
  if (req.tenant && userRestaurantId !== req.tenant.id) {
    return res.status(403).json({ error: 'Access denied to this restaurant' });
  }
  next();
}
