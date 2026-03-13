import { query } from '../db/pool.js';

// GET /api/platform/feature-flags
export async function getFeatureFlags(req, res, next) {
  try {
    const result = await query('SELECT * FROM feature_flags ORDER BY name');
    res.json(result.rows);
  } catch (err) { next(err); }
}

// PATCH /api/platform/feature-flags/:key
export async function updateFeatureFlag(req, res, next) {
  try {
    const { key } = req.params;
    const { is_enabled, allowed_plans } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (is_enabled !== undefined) {
      updates.push(`is_enabled = $${paramIndex++}`);
      values.push(is_enabled);
    }
    
    if (allowed_plans !== undefined) {
      updates.push(`allowed_plans = $${paramIndex++}`);
      values.push(allowed_plans);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(key);
    
    const result = await query(
      `UPDATE feature_flags SET ${updates.join(', ')} WHERE key = $${paramIndex} RETURNING *`,
      values
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/features - Get features available for a restaurant
export async function getRestaurantFeatures(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    
    // Get restaurant's plan
    const restaurantResult = await query(
      'SELECT subscription_plan FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    
    if (!restaurantResult.rows[0]) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const plan = restaurantResult.rows[0].subscription_plan;
    
    // Get enabled features for this plan
    const featuresResult = await query(
      `SELECT key, name, description, is_enabled, 
              (allowed_plans IS NULL OR $1 = ANY(allowed_plans)) as is_available
       FROM feature_flags
       WHERE is_enabled = TRUE`,
      [plan]
    );
    
    res.json({
      plan,
      features: featuresResult.rows.map(f => ({
        key: f.key,
        name: f.name,
        description: f.description,
        is_available: f.is_available
      }))
    });
  } catch (err) { next(err); }
}

// Check if a specific feature is available
export async function checkFeature(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { featureKey } = req.params;
    
    // Get restaurant's plan
    const restaurantResult = await query(
      'SELECT subscription_plan FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    
    const plan = restaurantResult.rows[0]?.subscription_plan || 'free';
    
    // Check feature
    const featureResult = await query(
      `SELECT key, name, is_enabled,
              (allowed_plans IS NULL OR $1 = ANY(allowed_plans)) as is_available
       FROM feature_flags
       WHERE key = $2`,
      [plan, featureKey]
    );
    
    if (!featureResult.rows[0]) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    
    const feature = featureResult.rows[0];
    
    res.json({
      key: feature.key,
      name: feature.name,
      is_enabled: feature.is_enabled,
      is_available: feature.is_available,
      can_use: feature.is_enabled && feature.is_available
    });
  } catch (err) { next(err); }
}
