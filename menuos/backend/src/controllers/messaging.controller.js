import { query } from '../db/pool.js';

// GET /api/platform/conversations - Get all conversations (platform admin)
export async function getConversations(req, res, next) {
  try {
    const { status, priority } = req.query;
    
    let sql = `
      SELECT 
        c.*,
        r.name as restaurant_name,
        r.slug as restaurant_slug,
        u.name as user_name,
        u.email as user_email,
        COUNT(m.id) FILTER (WHERE m.is_read = FALSE AND m.sender_type != 'platform_admin') as unread_count,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      JOIN restaurants r ON c.restaurant_id = r.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      sql += ` AND c.priority = $${params.length}`;
    }
    
    sql += ` GROUP BY c.id, r.name, r.slug, u.name, u.email ORDER BY c.last_message_at DESC`;
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/platform/conversations/:id - Get conversation details with messages
export async function getConversation(req, res, next) {
  try {
    const { id } = req.params;
    
    // Get conversation
    const convResult = await query(`
      SELECT 
        c.*,
        r.name as restaurant_name,
        r.slug as restaurant_slug,
        u.name as user_name,
        u.email as user_email
      FROM conversations c
      JOIN restaurants r ON c.restaurant_id = r.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `, [id]);
    
    if (!convResult.rows[0]) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get messages
    const messagesResult = await query(`
      SELECT 
        m.*,
        u.name as sender_name,
        u.email as sender_email
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [id]);
    
    res.json({
      conversation: convResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (err) { next(err); }
}

// POST /api/platform/conversations/:id/messages - Send message as platform admin
export async function sendPlatformMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const senderId = req.user.id;
    
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Insert message
    const messageResult = await query(`
      INSERT INTO messages (conversation_id, sender_id, sender_type, content)
      VALUES ($1, $2, 'platform_admin', $3)
      RETURNING *
    `, [id, senderId, content.trim()]);
    
    // Update conversation
    await query(`
      UPDATE conversations 
      SET last_message_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [id]);
    
    res.status(201).json(messageResult.rows[0]);
  } catch (err) { next(err); }
}

// PATCH /api/platform/conversations/:id - Update conversation status/priority
export async function updateConversation(req, res, next) {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await query(
      `UPDATE conversations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/platform/conversations/stats - Get messaging stats
export async function getMessagingStats(req, res, next) {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'open') as open_conversations,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_conversations,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
        COUNT(*) FILTER (WHERE priority = 'high') as high_count,
        (SELECT COUNT(*) FROM messages WHERE is_read = FALSE AND sender_type != 'platform_admin') as unread_messages
      FROM conversations
    `);
    
    // Response time stats (average time to first response)
    const responseTimeResult = await query(`
      SELECT AVG(
        EXTRACT(EPOCH FROM (admin_reply.created_at - first_message.created_at))
      ) as avg_response_seconds
      FROM conversations c
      JOIN LATERAL (
        SELECT created_at FROM messages 
        WHERE conversation_id = c.id AND sender_type = 'user'
        ORDER BY created_at ASC LIMIT 1
      ) first_message ON true
      JOIN LATERAL (
        SELECT created_at FROM messages 
        WHERE conversation_id = c.id AND sender_type = 'platform_admin'
        ORDER BY created_at ASC LIMIT 1
      ) admin_reply ON true
      WHERE c.status != 'open'
    `);
    
    res.json({
      ...result.rows[0],
      avg_response_time_seconds: Math.round(responseTimeResult.rows[0]?.avg_response_seconds || 0)
    });
  } catch (err) { next(err); }
}

// Restaurant-side endpoints

// GET /api/restaurants/:slug/conversations - Get restaurant conversations
export async function getRestaurantConversations(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    
    const result = await query(`
      SELECT 
        c.*,
        COUNT(m.id) FILTER (WHERE m.is_read = FALSE AND m.sender_type = 'platform_admin') as unread_count,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.restaurant_id = $1
      GROUP BY c.id
      ORDER BY c.last_message_at DESC
    `, [restaurantId]);
    
    res.json(result.rows);
  } catch (err) { next(err); }
}

// POST /api/restaurants/:slug/conversations - Create new conversation
export async function createConversation(req, res, next) {
  try {
    const restaurantId = req.tenant.id;
    const userId = req.user.id;
    const { subject, content, priority } = req.body;
    
    if (!subject?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'Subject and content are required' });
    }
    
    // Create conversation
    const convResult = await query(`
      INSERT INTO conversations (restaurant_id, user_id, subject, priority)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [restaurantId, userId, subject.trim(), priority || 'normal']);
    
    // Create first message
    await query(`
      INSERT INTO messages (conversation_id, sender_id, sender_type, content)
      VALUES ($1, $2, 'user', $3)
    `, [convResult.rows[0].id, userId, content.trim()]);
    
    res.status(201).json(convResult.rows[0]);
  } catch (err) { next(err); }
}

// GET /api/restaurants/:slug/conversations/:id - Get conversation with messages
export async function getRestaurantConversation(req, res, next) {
  try {
    const { id } = req.params;
    const restaurantId = req.tenant.id;
    
    // Verify ownership
    const convResult = await query(`
      SELECT * FROM conversations WHERE id = $1 AND restaurant_id = $2
    `, [id, restaurantId]);
    
    if (!convResult.rows[0]) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get messages
    const messagesResult = await query(`
      SELECT 
        m.*,
        u.name as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [id]);
    
    // Mark messages as read
    await query(`
      UPDATE messages SET is_read = TRUE, read_at = NOW()
      WHERE conversation_id = $1 AND sender_type = 'platform_admin' AND is_read = FALSE
    `, [id]);
    
    res.json({
      conversation: convResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (err) { next(err); }
}

// POST /api/restaurants/:slug/conversations/:id/messages - Send message
export async function sendRestaurantMessage(req, res, next) {
  try {
    const { id } = req.params;
    const restaurantId = req.tenant.id;
    const userId = req.user.id;
    const { content } = req.body;
    
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Verify ownership
    const convResult = await query(`
      SELECT id FROM conversations WHERE id = $1 AND restaurant_id = $2
    `, [id, restaurantId]);
    
    if (!convResult.rows[0]) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Insert message
    const messageResult = await query(`
      INSERT INTO messages (conversation_id, sender_id, sender_type, content)
      VALUES ($1, $2, 'user', $3)
      RETURNING *
    `, [id, userId, content.trim()]);
    
    // Update conversation
    await query(`
      UPDATE conversations 
      SET last_message_at = NOW(), updated_at = NOW(), status = 'open'
      WHERE id = $1
    `, [id]);
    
    res.status(201).json(messageResult.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/platform/conversations - Create conversation as platform admin
export async function createPlatformConversation(req, res, next) {
  try {
    const { restaurant_id, subject, content, priority } = req.body;
    const senderId = req.user.id;
    
    if (!restaurant_id || !subject?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'Restaurant, subject and content are required' });
    }
    
    // Get restaurant owner
    const ownerResult = await query(`
      SELECT id FROM users WHERE restaurant_id = $1 AND role = 'restaurant_admin' LIMIT 1
    `, [restaurant_id]);
    
    const userId = ownerResult.rows[0]?.id;
    
    // Create conversation
    const convResult = await query(`
      INSERT INTO conversations (restaurant_id, user_id, subject, priority)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [restaurant_id, userId, subject.trim(), priority || 'normal']);
    
    // Create first message
    await query(`
      INSERT INTO messages (conversation_id, sender_id, sender_type, content)
      VALUES ($1, $2, 'platform_admin', $3)
    `, [convResult.rows[0].id, senderId, content.trim()]);
    
    res.status(201).json(convResult.rows[0]);
  } catch (err) { next(err); }
}
