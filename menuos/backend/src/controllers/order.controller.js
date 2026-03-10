import { query } from '../db/pool.js';
import { mockPayment } from '../services/payment.service.js';
import { getIO } from '../socket/index.js';

// POST /api/restaurants/:slug/orders/payment  — initiate payment
export async function initiatePayment(req, res, next) {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const result = await mockPayment(parseFloat(amount));
    res.json(result);
  } catch (err) { next(err); }
}

// POST /api/restaurants/:slug/orders  — create order after payment
export async function createOrder(req, res, next) {
  try {
    const { mobile_number, table_number, items, notes, payment_tx_id } = req.body;

    if (!mobile_number || !table_number || !items?.length) {
      return res.status(400).json({ error: 'mobile_number, table_number and items are required' });
    }

    // Verify payment transaction ID
    if (!payment_tx_id) {
      return res.status(400).json({ error: 'Payment transaction ID required' });
    }

    // Calculate total from DB prices (never trust client-side prices)
    const itemIds = items.map(i => i.menu_item_id);
    const menuResult = await query(
      'SELECT id, name, price FROM menu_items WHERE id = ANY($1) AND restaurant_id = $2 AND is_available = TRUE',
      [itemIds, req.tenant.id]
    );

    const menuMap = Object.fromEntries(menuResult.rows.map(m => [m.id, m]));
    let total = 0;
    const orderItems = items.map(item => {
      const menuItem = menuMap[item.menu_item_id];
      if (!menuItem) throw Object.assign(new Error(`Item ${item.menu_item_id} not found`), { status: 400 });
      const lineTotal = menuItem.price * item.quantity;
      total += lineTotal;
      return { menu_item_id: menuItem.id, name: menuItem.name, price: menuItem.price, quantity: item.quantity };
    });

    // Generate order number
    const countResult = await query(
      "SELECT COUNT(*) FROM orders WHERE restaurant_id = $1 AND created_at >= date_trunc('month', NOW())",
      [req.tenant.id]
    );
    const orderNum = `ORD-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    // Create order
    const orderResult = await query(
      `INSERT INTO orders
        (restaurant_id, order_number, mobile_number, table_number, total_amount,
         payment_status, payment_tx_id, notes)
       VALUES ($1,$2,$3,$4,$5,'paid',$6,$7) RETURNING *`,
      [req.tenant.id, orderNum, mobile_number, table_number,
       total.toFixed(2), payment_tx_id, notes || null]
    );
    const order = orderResult.rows[0];

    // Create order items
    for (const item of orderItems) {
      await query(
        `INSERT INTO order_items (order_id, menu_item_id, name_snapshot, price_snapshot, quantity)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.menu_item_id, item.name, item.price, item.quantity]
      );
    }

    // Fetch full order with items for response
    const fullOrder = await getOrderWithItems(order.id, req.tenant.id);

    // Emit to kitchen dashboard
    const io = getIO();
    io.to(`kitchen:${req.tenant.id}`).emit('new_order', fullOrder);

    res.status(201).json(fullOrder);
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/orders
export async function getOrders(req, res, next) {
  try {
    const { status, date, limit = 50, offset = 0 } = req.query;
    let sql = `SELECT o.*, 
               json_agg(json_build_object(
                 'id', oi.id, 'name', oi.name_snapshot,
                 'price', oi.price_snapshot, 'quantity', oi.quantity
               )) as items
               FROM orders o
               LEFT JOIN order_items oi ON oi.order_id = o.id
               WHERE o.restaurant_id = $1`;
    const params = [req.tenant.id];
    let i = 2;

    if (status) { sql += ` AND o.order_status = $${i++}`; params.push(status); }
    if (date) { sql += ` AND o.created_at::date = $${i++}`; params.push(date); }

    sql += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// PATCH /api/restaurants/:slug/orders/:orderId/status
export async function updateOrderStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await query(
      `UPDATE orders SET order_status = $1
       WHERE id = $2 AND restaurant_id = $3
       RETURNING id, order_number, order_status, table_number, updated_at`,
      [status, orderId, req.tenant.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });

    // Emit status update to kitchen
    const io = getIO();
    io.to(`kitchen:${req.tenant.id}`).emit('order_updated', result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function getOrderWithItems(orderId, restaurantId) {
  const result = await query(
    `SELECT o.*,
     json_agg(json_build_object(
       'id', oi.id, 'name', oi.name_snapshot,
       'price', oi.price_snapshot, 'quantity', oi.quantity
     )) as items
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.id = $1 AND o.restaurant_id = $2
     GROUP BY o.id`,
    [orderId, restaurantId]
  );
  return result.rows[0];
}
