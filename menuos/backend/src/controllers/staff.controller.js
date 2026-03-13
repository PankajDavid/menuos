import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';

// GET /api/restaurants/:slug/staff
export async function getStaff(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    
    const result = await query(
      `SELECT id, name, email, role, is_active, last_login_at, created_at
       FROM users 
       WHERE restaurant_id = $1 AND role != 'platform_admin'
       ORDER BY created_at DESC`,
      [restaurantId]
    );
    
    res.json(result.rows);
  } catch (err) { next(err); }
}

// POST /api/restaurants/:slug/staff
export async function createStaff(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate role
    const validRoles = ['admin', 'staff', 'kitchen'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(
      `INSERT INTO users (restaurant_id, name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, is_active, created_at`,
      [restaurantId, name, email, passwordHash, role, true]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// PATCH /api/restaurants/:slug/staff/:userId/toggle
export async function toggleStaffStatus(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const { userId } = req.params;

    // Toggle the is_active status
    const result = await query(
      `UPDATE users 
       SET is_active = NOT is_active
       WHERE id = $1 AND restaurant_id = $2
       RETURNING id, name, email, role, is_active`,
      [userId, restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(result.rows[0]);
  } catch (err) { next(err); }
}
