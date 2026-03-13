import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { query } from '../db/pool.js';
import { slugify } from '../utils/slugify.js';
import { logActivity } from './activity.controller.js';

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
}

function signRefresh(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
}

// POST /api/auth/signup
export async function signup(req, res, next) {
  try {
    const { ownerName, email, password, restaurantName, phone, address } = req.body;

    if (!ownerName || !email || !password || !restaurantName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check email uniqueness
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate unique slug
    let slug = slugify(restaurantName);
    const slugExists = await query('SELECT id FROM restaurants WHERE slug = $1', [slug]);
    if (slugExists.rows.length > 0) slug = `${slug}-${uuidv4().split('-')[0]}`;

    const passwordHash = await bcrypt.hash(password, 12);

    // Create restaurant
    const restaurantResult = await query(
      `INSERT INTO restaurants (name, slug, owner_email, phone, address)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [restaurantName, slug, email, phone || null, address || null]
    );
    const restaurant = restaurantResult.rows[0];

    // Create admin user
    const userResult = await query(
      `INSERT INTO users (restaurant_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin') RETURNING id, name, email, role`,
      [restaurant.id, ownerName, email, passwordHash]
    );
    const user = userResult.rows[0];

    const tokenPayload = { userId: user.id, restaurantId: restaurant.id, role: user.role };
    const accessToken = signAccess(tokenPayload);
    const refreshToken = signRefresh({ userId: user.id });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    await query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
      [user.id, tokenHash, expiresAt]);

    res.status(201).json({ accessToken, refreshToken, user, restaurant });
  } catch (err) { next(err); }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const userResult = await query(
      `SELECT u.*, r.slug as restaurant_slug, r.name as restaurant_name
       FROM users u
       LEFT JOIN restaurants r ON r.id = u.restaurant_id
       WHERE u.email = $1 AND u.is_active = TRUE`,
      [email]
    );

    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const tokenPayload = { userId: user.id, restaurantId: user.restaurant_id, role: user.role };
    const accessToken = signAccess(tokenPayload);
    const refreshToken = signRefresh({ userId: user.id });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    await query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
      [user.id, tokenHash, expiresAt]);

    // Log activity
    await logActivity({
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      restaurant_id: user.restaurant_id,
      restaurant_name: user.restaurant_name,
      action: 'login',
      entity_type: 'user',
      entity_id: user.id,
      details: { email: user.email },
      ip_address: req.ip
    });

    const { password_hash, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) { next(err); }
}

// GET /api/auth/me
export async function me(req, res, next) {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.restaurant_id,
              r.name as restaurant_name, r.slug as restaurant_slug,
              r.subscription_plan, r.logo_url
       FROM users u
       LEFT JOIN restaurants r ON r.id = u.restaurant_id
       WHERE u.id = $1`,
      [req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/auth/logout
export async function logout(req, res, next) {
  try {
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.userId]);
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
}

// POST /api/auth/forgot-password
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const userResult = await query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (!userResult.rows[0]) {
      // Don't reveal if email exists
      return res.json({ message: 'If an account exists, a reset link has been sent' });
    }

    const user = userResult.rows[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    // Log activity (mock email - in production, send actual email)
    await logActivity({
      user_id: user.id,
      user_name: user.name,
      action: 'password_reset_requested',
      entity_type: 'user',
      entity_id: user.id,
      details: { email: user.email, reset_token: resetToken },
      ip_address: req.ip
    });

    // In production, send email with reset link
    // For now, return the token in response (for testing)
    res.json({ 
      message: 'If an account exists, a reset link has been sent',
      // Only in development:
      ...(process.env.NODE_ENV !== 'production' && { resetToken, resetUrl: `/reset-password?token=${resetToken}` })
    });
  } catch (err) { next(err); }
}

// POST /api/auth/reset-password
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const userResult = await query(
      'SELECT id, name, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );

    if (!userResult.rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = userResult.rows[0];
    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    // Log activity
    await logActivity({
      user_id: user.id,
      user_name: user.name,
      action: 'password_reset_completed',
      entity_type: 'user',
      entity_id: user.id,
      details: { email: user.email },
      ip_address: req.ip
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) { next(err); }
}

// POST /api/auth/change-password (for logged-in users)
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const userResult = await query('SELECT id, name, email, password_hash FROM users WHERE id = $1', [req.user.userId]);
    if (!userResult.rows[0]) return res.status(404).json({ error: 'User not found' });

    const user = userResult.rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, user.id]);

    // Log activity
    await logActivity({
      user_id: user.id,
      user_name: user.name,
      action: 'password_changed',
      entity_type: 'user',
      entity_id: user.id,
      details: { email: user.email },
      ip_address: req.ip
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
}
