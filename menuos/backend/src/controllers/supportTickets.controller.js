import { query } from '../db/pool.js';

// Generate ticket number (e.g., SUP-2024-0001)
function generateTicketNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SUP-${year}-${random}`;
}

// GET /api/platform/support-tickets - Get all tickets (platform admin)
export async function getSupportTickets(req, res, next) {
  try {
    const { status, priority, category } = req.query;
    
    let sql = `
      SELECT 
        st.*,
        u.name as user_name,
        u.email as user_email,
        r.name as restaurant_name,
        r.slug as restaurant_slug,
        au.name as assigned_to_name
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN restaurants r ON st.restaurant_id = r.id
      LEFT JOIN users au ON st.assigned_to = au.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      sql += ` AND st.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      sql += ` AND st.priority = $${params.length}`;
    }
    if (category) {
      params.push(category);
      sql += ` AND st.category = $${params.length}`;
    }
    
    sql += ` ORDER BY 
      CASE st.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      st.created_at DESC
    `;
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/support-tickets - Get user's tickets
export async function getUserTickets(req, res, next) {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        st.*,
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = st.id AND is_internal = FALSE) as message_count
      FROM support_tickets st
      WHERE st.user_id = $1
      ORDER BY st.created_at DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/support-tickets/:id - Get ticket details
export async function getTicket(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isPlatformAdmin = req.user.role === 'platform_admin';
    
    // Get ticket
    const ticketResult = await query(`
      SELECT 
        st.*,
        u.name as user_name,
        u.email as user_email,
        r.name as restaurant_name,
        r.slug as restaurant_slug,
        au.name as assigned_to_name
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN restaurants r ON st.restaurant_id = r.id
      LEFT JOIN users au ON st.assigned_to = au.id
      WHERE st.id = $1
    `, [id]);
    
    if (!ticketResult.rows[0]) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const ticket = ticketResult.rows[0];
    
    // Check permission
    if (!isPlatformAdmin && ticket.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get messages
    const messagesSql = isPlatformAdmin 
      ? `SELECT sm.*, u.name as user_name FROM support_messages sm LEFT JOIN users u ON sm.user_id = u.id WHERE sm.ticket_id = $1 ORDER BY sm.created_at`
      : `SELECT sm.*, u.name as user_name FROM support_messages sm LEFT JOIN users u ON sm.user_id = u.id WHERE sm.ticket_id = $1 AND sm.is_internal = FALSE ORDER BY sm.created_at`;
    
    const messagesResult = await query(messagesSql, [id]);
    
    res.json({
      ...ticket,
      messages: messagesResult.rows
    });
  } catch (err) { next(err); }
}

// POST /api/support-tickets - Create ticket
export async function createTicket(req, res, next) {
  try {
    const { subject, description, category, priority } = req.body;
    const userId = req.user.id;
    
    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }
    
    // Get user's restaurant
    const userResult = await query('SELECT restaurant_id FROM users WHERE id = $1', [userId]);
    const restaurantId = userResult.rows[0]?.restaurant_id;
    
    const ticketNumber = generateTicketNumber();
    
    const result = await query(`
      INSERT INTO support_tickets (ticket_number, user_id, restaurant_id, subject, description, category, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [ticketNumber, userId, restaurantId, subject, description, category || 'general', priority || 'medium']);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/support-tickets/:id/messages - Add message
export async function addMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { message, is_internal } = req.body;
    const userId = req.user.id;
    const isPlatformAdmin = req.user.role === 'platform_admin';
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Check ticket exists and permissions
    const ticketResult = await query('SELECT user_id, status FROM support_tickets WHERE id = $1', [id]);
    if (!ticketResult.rows[0]) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const ticket = ticketResult.rows[0];
    
    if (!isPlatformAdmin && ticket.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Only platform admins can add internal notes
    const internalFlag = isPlatformAdmin ? (is_internal || false) : false;
    
    const result = await query(`
      INSERT INTO support_messages (ticket_id, user_id, message, is_internal)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, userId, message, internalFlag]);
    
    // Update ticket status if needed
    if (ticket.status === 'open' && !internalFlag) {
      await query(`UPDATE support_tickets SET status = 'in_progress', updated_at = NOW() WHERE id = $1`, [id]);
    }
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// PATCH /api/platform/support-tickets/:id - Update ticket (platform admin)
export async function updateTicket(req, res, next) {
  try {
    const { id } = req.params;
    const { status, priority, assigned_to, resolution_notes } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      
      if (status === 'resolved') {
        updates.push(`resolved_at = NOW()`);
      }
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      values.push(assigned_to);
    }
    if (resolution_notes !== undefined) {
      updates.push(`resolution_notes = $${paramIndex++}`);
      values.push(resolution_notes);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await query(
      `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/platform/support-tickets/stats - Get ticket statistics
export async function getTicketStats(req, res, next) {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status IN ('open', 'in_progress', 'waiting')) as open_count,
        COUNT(*) FILTER (WHERE status = 'open') as new_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'waiting') as waiting_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        COUNT(*) FILTER (WHERE priority = 'urgent' AND status IN ('open', 'in_progress', 'waiting')) as urgent_count,
        COUNT(*) FILTER (WHERE priority = 'high' AND status IN ('open', 'in_progress', 'waiting')) as high_count
      FROM support_tickets
    `);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}
