import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../api/queries.js';

const STATUS_COLORS = { pending:'#2563EB', preparing:'#D97706', ready:'#16A34A', served:'#64748b', cancelled:'#dc2626' };

export default function OrdersPanel() {
  const { slug } = useParams();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', slug, filter],
    queryFn: () => orderApi.getAll(slug, filter ? { status: filter } : {}),
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => orderApi.updateStatus(slug, id, status),
    onSuccess: () => qc.invalidateQueries(['orders', slug]),
  });

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Orders</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['', 'pending', 'preparing', 'ready', 'served', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid #e2e8f0', background: filter === s ? '#1A1A2E' : '#fff', color: filter === s ? '#C8A84B' : '#374151', fontSize: 13, cursor: 'pointer' }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? <div>Loading…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => (
            <div key={order.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>#{order.order_number}</span>
                  <span style={{ marginLeft: 12, color: '#64748b', fontSize: 14 }}>Table {order.table_number}</span>
                  <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 13 }}>{order.mobile_number}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ background: STATUS_COLORS[order.order_status] + '20', color: STATUS_COLORS[order.order_status], padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    {order.order_status}
                  </span>
                  <span style={{ color: '#C8A84B', fontWeight: 700, fontSize: 18 }}>₹{parseFloat(order.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {order.items?.filter(Boolean).map((item, i) => (
                  <span key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>
                    {item.name} ×{item.quantity}
                  </span>
                ))}
              </div>

              {order.notes && <div style={{ color: '#92400e', background: '#fffbeb', padding: '6px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>📝 {order.notes}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(order.created_at).toLocaleString()}</span>
                {!['served','cancelled'].includes(order.order_status) && (
                  <select value={order.order_status}
                    onChange={e => updateMutation.mutate({ id: order.id, status: e.target.value })}
                    style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                    {['pending','preparing','ready','served','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
            </div>
          ))}
          {orders.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>No orders found</div>}
        </div>
      )}
    </div>
  );
}
