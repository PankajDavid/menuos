import { query } from '../db/pool.js';

// GET /api/platform/announcements - Get all announcements (platform admin)
export async function getAnnouncements(req, res, next) {
  try {
    const result = await query(`
      SELECT a.*, u.name as created_by_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/announcements - Get active announcements for current user
export async function getActiveAnnouncements(req, res, next) {
  try {
    const userRole = req.user?.role;
    const targetAudience = userRole === 'platform_admin' ? 'platform_admins' : 
                          userRole === 'admin' || userRole === 'staff' || userRole === 'kitchen' ? 'restaurants' : 'all';
    
    const result = await query(`
      SELECT id, title, content, type, target_audience, created_at
      FROM announcements
      WHERE is_active = TRUE
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (target_audience = 'all' OR target_audience = $1)
      ORDER BY created_at DESC
    `, [targetAudience]);
    
    res.json(result.rows);
  } catch (err) { next(err); }
}

// POST /api/platform/announcements - Create announcement
export async function createAnnouncement(req, res, next) {
  try {
    const { title, content, type, target_audience, starts_at, expires_at } = req.body;
    const createdBy = req.user.id;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const result = await query(`
      INSERT INTO announcements (title, content, type, target_audience, created_by, starts_at, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, content, type || 'info', target_audience || 'all', createdBy, starts_at || null, expires_at || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// PATCH /api/platform/announcements/:id - Update announcement
export async function updateAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const { title, content, type, target_audience, is_active, starts_at, expires_at } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (target_audience !== undefined) {
      updates.push(`target_audience = $${paramIndex++}`);
      values.push(target_audience);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (starts_at !== undefined) {
      updates.push(`starts_at = $${paramIndex++}`);
      values.push(starts_at);
    }
    if (expires_at !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(expires_at);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await query(
      `UPDATE announcements SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// DELETE /api/platform/announcements/:id
export async function deleteAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    res.json({ message: 'Announcement deleted' });
  } catch (err) { next(err); }
}
