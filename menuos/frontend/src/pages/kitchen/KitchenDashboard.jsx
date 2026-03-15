import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../../api/queries.js';
import { useAuthStore } from '../../store/authStore.js';
import { useKitchenSocket } from '../../hooks/useKitchenSocket.js';

const COLUMNS = [
  { key: 'pending',   label: 'Pending', icon: '🔔', color: '#2563EB', bg: '#eff6ff', next: 'preparing', nextLabel: 'Start' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', color: '#D97706', bg: '#fffbeb', next: 'ready',     nextLabel: 'Ready' },
  { key: 'ready',     label: 'Ready', icon: '✅', color: '#16A34A', bg: '#f0fdf4', next: 'served',    nextLabel: 'Served' },
  { key: 'served',    label: 'Served', icon: '🍽', color: '#64748B', bg: '#f8fafc', next: null,        nextLabel: null },
];

export default function KitchenDashboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [orders, setOrders] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  const { data: initialOrders = [], isLoading } = useQuery({
    queryKey: ['kitchen-orders', slug],
    queryFn: () => orderApi.getAll(slug),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => { if (initialOrders.length) setOrders(initialOrders); }, [initialOrders]);

  useKitchenSocket(
    user?.restaurantId,
    (newOrder) => setOrders(p => [newOrder, ...p]),
    (update) => setOrders(p => p.map(o => o.id === update.id ? { ...o, order_status: update.order_status } : o))
  );

  const advance = async (orderId, newStatus) => {
    await orderApi.updateStatus(slug, orderId, newStatus);
    setOrders(p => p.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
  };

  const cancel = async (orderId) => {
    if (!confirm('Cancel this order?')) return;
    await orderApi.updateStatus(slug, orderId, 'cancelled');
    setOrders(p => p.map(o => o.id === orderId ? { ...o, order_status: 'cancelled' } : o));
  };

  const getMinutesAgo = (dateStr) => Math.floor((Date.now() - new Date(dateStr)) / 60000);

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', background: '#0f172a', color: '#fff', minHeight: '100vh' }}>Loading orders…</div>;

  const activeOrders = orders.filter(o => o.order_status !== 'served' && o.order_status !== 'cancelled');

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: '#1e293b',
        padding: isMobile ? '12px 16px' : '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #334155',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isMobile && (
            <button
              onClick={() => navigate(`/r/${slug}/admin`)}
              style={{ background: 'transparent', border: 'none', color: '#C8A84B', fontSize: 20, cursor: 'pointer', padding: 4 }}
            >
              ←
            </button>
          )}
          <div>
            <div style={{ color: '#C8A84B', fontFamily: 'Playfair Display, serif', fontSize: isMobile ? 18 : 22 }}>
              {isMobile ? '🍽 Kitchen' : '🍽 Kitchen Dashboard'}
            </div>
            {!isMobile && <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Live order feed — updates in real time</div>}
          </div>
        </div>
        <div style={{
          background: '#334155',
          padding: '6px 12px',
          borderRadius: 20,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {activeOrders.length} active
        </div>
      </div>

      {/* Kanban */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        gap: isMobile ? 12 : 16,
        padding: isMobile ? 12 : 20,
        overflowX: isMobile ? 'auto' : 'visible',
      }}>
        {COLUMNS.map(col => {
          const colOrders = orders.filter(o => o.order_status === col.key);
          return (
            <div key={col.key} style={{ minWidth: isMobile ? 'auto' : 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ color: col.color, fontSize: isMobile ? 13 : 15, fontWeight: 700 }}>
                  {col.icon} {col.label}
                </h3>
                <span style={{
                  background: col.color,
                  color: '#fff',
                  borderRadius: 12,
                  padding: '2px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {colOrders.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: isMobile ? 100 : 200 }}>
                {colOrders.map(order => {
                  const mins = getMinutesAgo(order.created_at);
                  const isLate = mins > 15 && col.key === 'pending';
                  return (
                    <div key={order.id}
                      style={{
                        background: isLate ? '#450a0a' : '#1e293b',
                        border: `1px solid ${isLate ? '#ef4444' : '#334155'}`,
                        borderRadius: 10,
                        padding: isMobile ? 12 : 16,
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#C8A84B', fontWeight: 700, fontSize: isMobile ? 14 : 15 }}>#{order.order_number}</span>
                        <span style={{
                          color: mins > 15 ? '#ef4444' : '#94a3b8',
                          fontSize: 11,
                          fontWeight: mins > 15 ? 600 : 400,
                        }}>
                          {mins}m
                        </span>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
                        Table {order.table_number} · {order.mobile_number}
                      </div>

                      {/* Items */}
                      <div style={{ marginBottom: 8 }}>
                        {order.items?.filter(Boolean).map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', fontSize: 12, padding: '2px 0' }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                            <span style={{ color: '#64748b', marginLeft: 8 }}>×{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div style={{
                          color: '#fbbf24',
                          fontSize: 11,
                          marginBottom: 8,
                          padding: '4px 8px',
                          background: 'rgba(251,191,36,0.08)',
                          borderRadius: 6,
                        }}>
                          📝 {order.notes}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#C8A84B', fontFamily: 'Playfair Display, serif', fontSize: isMobile ? 14 : 16 }}>
                          ₹{parseFloat(order.total_amount).toFixed(0)}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {col.key === 'pending' && (
                            <button onClick={() => cancel(order.id)}
                              style={{
                                padding: isMobile ? '4px 8px' : '5px 10px',
                                background: 'transparent',
                                border: '1px solid #ef4444',
                                color: '#ef4444',
                                borderRadius: 6,
                                fontSize: 11,
                              }}>
                              ✕
                            </button>
                          )}
                          {col.next && (
                            <button onClick={() => advance(order.id, col.next)}
                              style={{
                                padding: isMobile ? '4px 10px' : '5px 12px',
                                background: col.color,
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                              }}>
                              {col.nextLabel} →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {colOrders.length === 0 && (
                  <div style={{ color: '#334155', textAlign: 'center', padding: '20px 0', fontSize: 13, fontStyle: 'italic' }}>
                    No orders
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
