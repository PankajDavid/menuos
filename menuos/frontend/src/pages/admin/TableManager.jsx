import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tableApi } from '../../api/queries.js';

export default function TableManager() {
  const { slug } = useParams();
  const qc = useQueryClient();
  const [tableNum, setTableNum] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [qrData, setQrData] = useState(null);

  const { data: tables = [], isLoading } = useQuery({ queryKey: ['tables', slug], queryFn: () => tableApi.getAll(slug) });

  const createMutation = useMutation({
    mutationFn: () => tableApi.create(slug, { table_number: tableNum, capacity: parseInt(capacity) }),
    onSuccess: () => { qc.invalidateQueries(['tables', slug]); setTableNum(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => tableApi.delete(slug, id),
    onSuccess: () => qc.invalidateQueries(['tables', slug]),
  });

  const showQR = async (id) => {
    const data = await tableApi.getQR(slug, id);
    setQrData(data);
  };

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Tables & QR Codes</h1>

      {/* Add table */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Table Number</label>
          <input value={tableNum} onChange={e => setTableNum(e.target.value)} placeholder="e.g. T1, 5, VIP-1"
            style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, width: 160 }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Capacity</label>
          <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} min={1} max={20}
            style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, width: 100 }} />
        </div>
        <button onClick={() => tableNum && createMutation.mutate()} disabled={!tableNum}
          style={{ padding: '10px 20px', background: '#C8A84B', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
          + Add Table
        </button>
      </div>

      {/* Tables grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {tables.map(table => (
          <div key={table.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🪑</div>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Table {table.table_number}</div>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Capacity: {table.capacity}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => showQR(table.id)}
                style={{ padding: '7px 14px', background: '#1A1A2E', color: '#C8A84B', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                📱 QR Code
              </button>
              <button onClick={() => confirm('Delete table?') && deleteMutation.mutate(table.id)}
                style={{ padding: '7px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 13 }}>
                🗑
              </button>
            </div>
          </div>
        ))}
        {tables.length === 0 && !isLoading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>No tables yet. Add your first table!</div>
        )}
      </div>

      {/* QR Modal */}
      {qrData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setQrData(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 360 }}>
            <h2 style={{ marginBottom: 8 }}>Table {qrData.table_number}</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Customers scan this to access the menu</p>
            <img src={qrData.qr_data_url} alt="QR Code" style={{ width: 240, height: 240, border: '1px solid #e2e8f0', borderRadius: 8 }} />
            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 12, wordBreak: 'break-all' }}>{qrData.menu_url}</p>
            <a href={qrData.qr_data_url} download={`table-${qrData.table_number}-qr.png`}
              style={{ display: 'block', marginTop: 16, padding: '10px', background: '#C8A84B', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
              ⬇ Download PNG
            </a>
            <button onClick={() => setQrData(null)} style={{ marginTop: 10, padding: '8px 20px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
