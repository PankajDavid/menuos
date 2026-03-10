import { query } from '../db/pool.js';

// GET /api/restaurants/:slug/menu  — public
export async function getMenu(req, res, next) {
  try {
    const result = await query(
      `SELECT * FROM menu_items
       WHERE restaurant_id = $1 AND is_available = TRUE
       ORDER BY category, sort_order, name`,
      [req.tenant.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/menu/all — admin (includes unavailable)
export async function getAllMenuItems(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY category, sort_order, name',
      [req.tenant.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// POST /api/restaurants/:slug/menu
export async function createMenuItem(req, res, next) {
  try {
    const { name, category, description, price, tags, allergens, image_url, sort_order } = req.body;
    if (!name || !category || price == null) {
      return res.status(400).json({ error: 'name, category, and price are required' });
    }
    const result = await query(
      `INSERT INTO menu_items
        (restaurant_id, name, category, description, price, tags, allergens, image_url, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.tenant.id, name, category, description || null, price,
       tags || [], allergens || [], image_url || null, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// PUT /api/restaurants/:slug/menu/:itemId
export async function updateMenuItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const { name, category, description, price, tags, allergens, image_url, sort_order, is_available } = req.body;

    const result = await query(
      `UPDATE menu_items SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        description = COALESCE($3, description),
        price = COALESCE($4, price),
        tags = COALESCE($5, tags),
        allergens = COALESCE($6, allergens),
        image_url = COALESCE($7, image_url),
        sort_order = COALESCE($8, sort_order),
        is_available = COALESCE($9, is_available)
       WHERE id = $10 AND restaurant_id = $11
       RETURNING *`,
      [name, category, description, price, tags, allergens, image_url, sort_order, is_available,
       itemId, req.tenant.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// DELETE /api/restaurants/:slug/menu/:itemId
export async function deleteMenuItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const result = await query(
      'DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING id',
      [itemId, req.tenant.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
}

// PATCH /api/restaurants/:slug/menu/:itemId/toggle
export async function toggleAvailability(req, res, next) {
  try {
    const { itemId } = req.params;
    const result = await query(
      `UPDATE menu_items SET is_available = NOT is_available
       WHERE id = $1 AND restaurant_id = $2 RETURNING id, name, is_available`,
      [itemId, req.tenant.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}
