import { query } from '../db/pool.js';
import { v4 as uuidv4 } from 'uuid';

// Generate invoice number
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}-${random}`;
}

// Get plan pricing
function getPlanPrice(plan) {
  const prices = {
    free: 0,
    basic: 999,
    pro: 2499,
    premium: 4999
  };
  return prices[plan] || 0;
}

// GET /api/platform/invoices
export async function getAllInvoices(req, res, next) {
  try {
    const result = await query(`
      SELECT i.*, r.name as restaurant_name, r.slug as restaurant_slug
      FROM invoices i
      JOIN restaurants r ON i.restaurant_id = r.id
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/invoices
export async function getRestaurantInvoices(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const result = await query(
      'SELECT * FROM invoices WHERE restaurant_id = $1 ORDER BY created_at DESC',
      [restaurantId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// POST /api/platform/invoices - Create invoice for restaurant
export async function createInvoice(req, res, next) {
  try {
    const { restaurant_id, plan, discount_code, notes } = req.body;
    
    // Get restaurant details
    const restaurant = await query('SELECT * FROM restaurants WHERE id = $1', [restaurant_id]);
    if (!restaurant.rows[0]) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Calculate amounts
    const amount = getPlanPrice(plan);
    let discountAmount = 0;
    
    // Apply discount if provided
    if (discount_code) {
      const discount = await query(
        'SELECT * FROM discounts WHERE code = $1 AND is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()',
        [discount_code]
      );
      if (discount.rows[0]) {
        const d = discount.rows[0];
        if (d.discount_type === 'percentage') {
          discountAmount = (amount * d.discount_value) / 100;
        } else if (d.discount_type === 'fixed') {
          discountAmount = d.discount_value;
        }
        // Update discount usage
        await query('UPDATE discounts SET used_count = used_count + 1 WHERE id = $1', [d.id]);
      }
    }

    const finalAmount = Math.max(0, amount - discountAmount);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days to pay

    // Create invoice
    const result = await query(
      `INSERT INTO invoices (restaurant_id, invoice_number, amount, discount_amount, final_amount, plan, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [restaurant_id, generateInvoiceNumber(), amount, discountAmount, finalAmount, plan, dueDate, notes]
    );

    // Update restaurant next payment date
    await query(
      'UPDATE restaurants SET next_payment_date = $1, platform_fee_amount = $2 WHERE id = $3',
      [dueDate, finalAmount, restaurant_id]
    );

    // Create notification
    await query(
      `INSERT INTO notifications (restaurant_id, type, title, message)
       VALUES ($1, 'invoice_created', 'New Invoice Generated', 'Invoice #${result.rows[0].invoice_number} for ₹${finalAmount} has been generated. Due date: ${dueDate.toLocaleDateString()}')`,
      [restaurant_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// PATCH /api/platform/invoices/:id/pay - Mark invoice as paid
export async function payInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const { payment_method } = req.body;

    const invoice = await query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    if (!invoice.rows[0]) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const paidDate = new Date();
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1); // Next month

    // Update invoice
    const result = await query(
      `UPDATE invoices SET status = 'paid', paid_date = $1, payment_method = $2 WHERE id = $3 RETURNING *`,
      [paidDate, payment_method || 'manual', id]
    );

    // Update restaurant subscription
    await query(
      `UPDATE restaurants SET 
        subscription_status = 'active',
        payment_status = 'paid',
        last_payment_date = $1,
        next_payment_date = $2,
        grace_period_end_date = NULL
       WHERE id = $3`,
      [paidDate, nextPaymentDate, invoice.rows[0].restaurant_id]
    );

    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/platform/discounts
export async function getDiscounts(req, res, next) {
  try {
    const result = await query('SELECT * FROM discounts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { next(err); }
}

// POST /api/platform/discounts
export async function createDiscount(req, res, next) {
  try {
    const { code, name, discount_type, discount_value, max_uses, valid_from, valid_until } = req.body;
    
    const result = await query(
      `INSERT INTO discounts (code, name, discount_type, discount_value, max_uses, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [code, name, discount_type, discount_value, max_uses, valid_from, valid_until]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/notifications
export async function getNotifications(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const result = await query(
      'SELECT * FROM notifications WHERE restaurant_id = $1 ORDER BY created_at DESC LIMIT 20',
      [restaurantId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

// PATCH /api/restaurants/:slug/notifications/:id/read
export async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    const restaurantId = req.tenant.id;
    
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND restaurant_id = $2 RETURNING *',
      [id, restaurantId]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/platform/check-subscriptions - Cron job to check expired subscriptions
export async function checkSubscriptions(req, res, next) {
  try {
    const now = new Date();
    
    // Find subscriptions that expired and need grace period
    const expired = await query(`
      SELECT * FROM restaurants 
      WHERE subscription_status = 'active' 
      AND next_payment_date < $1
      AND (grace_period_end_date IS NULL OR grace_period_end_date > $1)
    `, [now]);

    for (const restaurant of expired.rows) {
      // Set grace period (7 days)
      const graceEnd = new Date(now);
      graceEnd.setDate(graceEnd.getDate() + 7);
      
      await query(
        `UPDATE restaurants SET 
          subscription_status = 'grace_period',
          payment_status = 'overdue',
          grace_period_end_date = $1
         WHERE id = $2`,
        [graceEnd, restaurant.id]
      );

      // Create notification
      await query(
        `INSERT INTO notifications (restaurant_id, type, title, message)
         VALUES ($1, 'subscription_expired', 'Subscription Expired', 'Your subscription has expired. You have 7 days grace period to renew. Please make payment to avoid service interruption.')`,
        [restaurant.id]
      );
    }

    // Find grace period ended - suspend
    const graceEnded = await query(`
      SELECT * FROM restaurants 
      WHERE subscription_status = 'grace_period' 
      AND grace_period_end_date < $1
    `, [now]);

    for (const restaurant of graceEnded.rows) {
      await query(
        `UPDATE restaurants SET 
          subscription_status = 'suspended',
          is_active = FALSE
         WHERE id = $1`,
        [restaurant.id]
      );

      // Create notification
      await query(
        `INSERT INTO notifications (restaurant_id, type, title, message)
         VALUES ($1, 'subscription_suspended', 'Account Suspended', 'Your account has been suspended due to non-payment. Please contact support to reactivate.')`,
        [restaurant.id]
      );
    }

    res.json({ 
      expired: expired.rows.length, 
      suspended: graceEnded.rows.length 
    });
  } catch (err) { next(err); }
}
