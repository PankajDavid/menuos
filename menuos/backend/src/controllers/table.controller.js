import QRCode from 'qrcode';
import { query } from '../db/pool.js';

export async function getTables(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM restaurant_tables WHERE restaurant_id = $1 ORDER BY table_number',
      [req.tenant.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

export async function createTable(req, res, next) {
  try {
    const { table_number, capacity } = req.body;
    if (!table_number) return res.status(400).json({ error: 'table_number required' });
    const result = await query(
      `INSERT INTO restaurant_tables (restaurant_id, table_number, capacity)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.tenant.id, table_number, capacity || 4]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Table number already exists' });
    next(err);
  }
}

export async function deleteTable(req, res, next) {
  try {
    const result = await query(
      'DELETE FROM restaurant_tables WHERE id = $1 AND restaurant_id = $2 RETURNING id',
      [req.params.tableId, req.tenant.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Table not found' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
}

export async function getQRCode(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM restaurant_tables WHERE id = $1 AND restaurant_id = $2',
      [req.params.tableId, req.tenant.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Table not found' });

    const table = result.rows[0];
    const base = process.env.QR_BASE_URL || 'https://menuos.app';
    const url = `${base}/r/${req.tenant.slug}/menu?table=${table.table_number}`;

    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 400, margin: 2,
      color: { dark: '#1A1A2E', light: '#FFFFFF' }
    });

    res.json({ qr_data_url: qrDataUrl, menu_url: url, table_number: table.table_number });
  } catch (err) { next(err); }
}
