import { query } from '../db/pool.js';

// GET /api/platform/onboarding-items - Get all checklist items (platform admin)
export async function getOnboardingItems(req, res, next) {
  try {
    const result = await query(`
      SELECT * FROM onboarding_checklist_items 
      WHERE is_active = TRUE 
      ORDER BY order_index, created_at
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// POST /api/platform/onboarding-items - Create checklist item (platform admin)
export async function createOnboardingItem(req, res, next) {
  try {
    const { key, title, description, category, order_index, is_required } = req.body;
    
    if (!key || !title) {
      return res.status(400).json({ error: 'Key and title are required' });
    }
    
    const result = await query(`
      INSERT INTO onboarding_checklist_items (key, title, description, category, order_index, is_required)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [key, title, description, category || 'setup', order_index || 0, is_required !== false]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { 
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Checklist item with this key already exists' });
    }
    next(err); 
  }
}

// PATCH /api/platform/onboarding-items/:id - Update checklist item (platform admin)
export async function updateOnboardingItem(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, category, order_index, is_required, is_active } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramIndex++}`);
      values.push(order_index);
    }
    if (is_required !== undefined) {
      updates.push(`is_required = $${paramIndex++}`);
      values.push(is_required);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id);
    const result = await query(
      `UPDATE onboarding_checklist_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// DELETE /api/platform/onboarding-items/:id (platform admin)
export async function deleteOnboardingItem(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM onboarding_checklist_items WHERE id = $1 RETURNING id', [id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    res.json({ message: 'Checklist item deleted' });
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/onboarding - Get restaurant onboarding progress
export async function getRestaurantOnboarding(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    
    const result = await query(`
      SELECT 
        oci.id,
        oci.key,
        oci.title,
        oci.description,
        oci.category,
        oci.order_index,
        oci.is_required,
        COALESCE(ro.is_completed, FALSE) as is_completed,
        ro.completed_at,
        ro.notes
      FROM onboarding_checklist_items oci
      LEFT JOIN restaurant_onboarding ro ON oci.id = ro.checklist_item_id AND ro.restaurant_id = $1
      WHERE oci.is_active = TRUE
      ORDER BY oci.order_index, oci.created_at
    `, [restaurantId]);
    
    // Calculate progress
    const total = result.rows.length;
    const completed = result.rows.filter(r => r.is_completed).length;
    const required = result.rows.filter(r => r.is_required);
    const requiredCompleted = required.filter(r => r.is_completed).length;
    
    res.json({
      items: result.rows,
      progress: {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        required_total: required.length,
        required_completed: requiredCompleted,
        required_percentage: required.length > 0 ? Math.round((requiredCompleted / required.length) * 100) : 0
      }
    });
  } catch (err) { next(err); }
}

// POST /api/restaurants/:slug/onboarding/:itemId/complete - Mark item complete
export async function completeOnboardingItem(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { itemId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;
    
    // Check if item exists
    const itemResult = await query('SELECT id FROM onboarding_checklist_items WHERE id = $1 AND is_active = TRUE', [itemId]);
    if (!itemResult.rows[0]) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    const result = await query(`
      INSERT INTO restaurant_onboarding (restaurant_id, checklist_item_id, is_completed, completed_at, completed_by, notes)
      VALUES ($1, $2, TRUE, NOW(), $3, $4)
      ON CONFLICT (restaurant_id, checklist_item_id)
      DO UPDATE SET is_completed = TRUE, completed_at = NOW(), completed_by = $3, notes = COALESCE($4, restaurant_onboarding.notes), updated_at = NOW()
      RETURNING *
    `, [restaurantId, itemId, userId, notes]);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/restaurants/:slug/onboarding/:itemId/uncomplete - Mark item incomplete
export async function uncompleteOnboardingItem(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { itemId } = req.params;
    
    const result = await query(`
      UPDATE restaurant_onboarding 
      SET is_completed = FALSE, completed_at = NULL, completed_by = NULL, updated_at = NOW()
      WHERE restaurant_id = $1 AND checklist_item_id = $2
      RETURNING *
    `, [restaurantId, itemId]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Progress record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/platform/onboarding/overview - Get platform-wide onboarding stats
export async function getOnboardingOverview(req, res, next) {
  try {
    const result = await query(`
      SELECT 
        r.id,
        r.name,
        r.slug,
        r.subscription_plan,
        r.created_at,
        COUNT(DISTINCT oci.id) FILTER (WHERE oci.is_active = TRUE) as total_items,
        COUNT(DISTINCT ro.checklist_item_id) FILTER (WHERE ro.is_completed = TRUE) as completed_items,
        COUNT(DISTINCT oci.id) FILTER (WHERE oci.is_active = TRUE AND oci.is_required = TRUE) as required_items,
        COUNT(DISTINCT ro.checklist_item_id) FILTER (WHERE ro.is_completed = TRUE AND oci.is_required = TRUE) as required_completed
      FROM restaurants r
      LEFT JOIN onboarding_checklist_items oci ON oci.is_active = TRUE
      LEFT JOIN restaurant_onboarding ro ON ro.restaurant_id = r.id AND ro.is_completed = TRUE
      LEFT JOIN onboarding_checklist_items oci2 ON oci2.id = ro.checklist_item_id
      GROUP BY r.id, r.name, r.slug, r.subscription_plan, r.created_at
      ORDER BY r.created_at DESC
    `);
    
    const stats = result.rows.map(r => ({
      ...r,
      completion_percentage: r.total_items > 0 ? Math.round((r.completed_items / r.total_items) * 100) : 0,
      required_completion_percentage: r.required_items > 0 ? Math.round((r.required_completed / r.required_items) * 100) : 0
    }));
    
    // Summary stats
    const summary = {
      total_restaurants: stats.length,
      fully_onboarded: stats.filter(s => s.completion_percentage === 100).length,
      partially_onboarded: stats.filter(s => s.completion_percentage > 0 && s.completion_percentage < 100).length,
      not_started: stats.filter(s => s.completion_percentage === 0).length,
      average_completion: stats.length > 0 ? Math.round(stats.reduce((a, s) => a + s.completion_percentage, 0) / stats.length) : 0
    };
    
    res.json({
      restaurants: stats,
      summary
    });
  } catch (err) { next(err); }
}
