import { query } from '../db/pool.js';

// GET /api/platform/email-templates
export async function getEmailTemplates(req, res, next) {
  try {
    const result = await query('SELECT * FROM email_templates ORDER BY name');
    res.json(result.rows);
  } catch (err) { next(err); }
}

// GET /api/platform/email-templates/:key
export async function getEmailTemplate(req, res, next) {
  try {
    const { key } = req.params;
    const result = await query('SELECT * FROM email_templates WHERE key = $1', [key]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// PATCH /api/platform/email-templates/:key
export async function updateEmailTemplate(req, res, next) {
  try {
    const { key } = req.params;
    const { subject, body_html, body_text, is_active } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      values.push(subject);
    }
    
    if (body_html !== undefined) {
      updates.push(`body_html = $${paramIndex++}`);
      values.push(body_html);
    }
    
    if (body_text !== undefined) {
      updates.push(`body_text = $${paramIndex++}`);
      values.push(body_text);
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(key);
    
    const result = await query(
      `UPDATE email_templates SET ${updates.join(', ')} WHERE key = $${paramIndex} RETURNING *`,
      values
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// POST /api/platform/email-templates/:key/preview
export async function previewEmailTemplate(req, res, next) {
  try {
    const { key } = req.params;
    const variables = req.body.variables || {};
    
    const result = await query('SELECT * FROM email_templates WHERE key = $1', [key]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Template not found' });
    
    const template = result.rows[0];
    
    // Replace variables in subject and body
    let subject = template.subject;
    let bodyHtml = template.body_html;
    let bodyText = template.body_text;
    
    Object.entries(variables).forEach(([varName, value]) => {
      const regex = new RegExp(`{{${varName}}}`, 'g');
      subject = subject.replace(regex, value);
      bodyHtml = bodyHtml.replace(regex, value);
      if (bodyText) bodyText = bodyText.replace(regex, value);
    });
    
    res.json({
      key: template.key,
      name: template.name,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      variables: template.variables
    });
  } catch (err) { next(err); }
}

// POST /api/platform/email-templates/:key/send-test
export async function sendTestEmail(req, res, next) {
  try {
    const { key } = req.params;
    const { to, variables } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Recipient email (to) is required' });
    }
    
    const result = await query('SELECT * FROM email_templates WHERE key = $1 AND is_active = TRUE', [key]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Template not found or inactive' });
    
    const template = result.rows[0];
    
    // Replace variables
    let subject = template.subject;
    let bodyHtml = template.body_html;
    let bodyText = template.body_text;
    
    const testVars = variables || {};
    Object.entries(testVars).forEach(([varName, value]) => {
      const regex = new RegExp(`{{${varName}}}`, 'g');
      subject = subject.replace(regex, value);
      bodyHtml = bodyHtml.replace(regex, value);
      if (bodyText) bodyText = bodyText.replace(regex, value);
    });
    
    // In a real implementation, you would integrate with an email service like SendGrid, AWS SES, etc.
    // For now, we'll just return what would be sent
    res.json({
      success: true,
      message: 'Test email prepared (email service integration required)',
      preview: {
        to,
        subject,
        body_html: bodyHtml,
        body_text: bodyText
      }
    });
  } catch (err) { next(err); }
}
