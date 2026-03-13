import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';
import { useAuthStore } from '../../store/authStore.js';
import { useNavigate, Link } from 'react-router-dom';

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };

export default function PlatformAdmin() {
  const qc = useQueryClient();
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: analytics } = useQuery({ queryKey: ['platform-analytics'], queryFn: platformApi.getAnalytics });
  const { data: restaurants = [] } = useQuery({ queryKey: ['platform-restaurants'], queryFn: platformApi.getRestaurants });

  const planMutation = useMutation({
    mutationFn: ({ id, plan }) => platformApi.updatePlan(id, plan),
    onSuccess: () => qc.invalidateQueries(['platform-restaurants']),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => platformApi.toggle(id),
    onSuccess: () => qc.invalidateQueries(['platform-restaurants']),
  });

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: '#C8A84B' }}>🍽 MenuOS — Platform Admin</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/r/pankys/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, padding: '7px 16px', border: '1px solid #334155', borderRadius: 8 }}>🏪 My Restaurant</Link>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '7px 16px', borderRadius: 8, cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: 32 }}>
        {/* Stats */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Active Restaurants', value: analytics.total_restaurants, color: '#C8A84B' },
              { label: 'Total Orders', value: analytics.total_orders, color: '#2563EB' },
              { label: 'Platform Revenue', value: `₹${parseFloat(analytics.total_revenue || 0).toFixed(0)}`, color: '#16A34A' },
              { label: 'Orders Today', value: analytics.orders_today, color: '#7C3AED' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', borderLeft: `4px solid ${color}` }}>
                <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Plan breakdown */}
        {analytics?.plan_breakdown && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 32 }}>
            <h2 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Subscription Distribution</h2>
            <div style={{ display: 'flex', gap: 24 }}>
              {analytics.plan_breakdown.map(({ subscription_plan, count }) => (
                <div key={subscription_plan} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: PLAN_COLORS[subscription_plan] }} />
                  <span style={{ textTransform: 'capitalize', color: '#94a3b8' }}>{subscription_plan}:</span>
                  <span style={{ fontWeight: 700, color: PLAN_COLORS[subscription_plan] }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restaurants table */}
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>All Restaurants ({restaurants.length})</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Restaurant', 'Owner', 'Plan', 'Orders', 'Revenue', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {restaurants.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>/{r.slug}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 14 }}>{r.owner_email}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <select value={r.subscription_plan}
                        onChange={e => planMutation.mutate({ id: r.id, plan: e.target.value })}
                        style={{ background: '#0f172a', color: PLAN_COLORS[r.subscription_plan], border: `1px solid ${PLAN_COLORS[r.subscription_plan]}`, padding: '4px 8px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="premium">Premium</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{r.total_orders}</td>
                    <td style={{ padding: '14px 16px', color: '#C8A84B', fontWeight: 600 }}>₹{parseFloat(r.total_revenue || 0).toFixed(0)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: r.is_active ? '#dcfce7' : '#fee2e2', color: r.is_active ? '#16A34A' : '#dc2626' }}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a href={`/r/${r.slug}/menu`} target="_blank" rel="noreferrer"
                          style={{ padding: '5px 10px', background: '#1e40af', color: '#fff', borderRadius: 6, fontSize: 12, textDecoration: 'none' }}>View</a>
                        <button onClick={() => toggleMutation.mutate(r.id)}
                          style={{ padding: '5px 10px', background: r.is_active ? '#450a0a' : '#052e16', color: r.is_active ? '#ef4444' : '#22c55e', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                          {r.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
