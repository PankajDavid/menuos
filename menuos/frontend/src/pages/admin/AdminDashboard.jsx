import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { restaurantApi } from '../../api/queries.js';

function StatCard({ icon, label, value, color = '#2563EB' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { slug } = useParams();
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', slug],
    queryFn: () => restaurantApi.getAnalytics(slug),
    refetchInterval: 60000,
  });

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Dashboard</h1>
      <p style={{ color: '#64748b', marginBottom: 28 }}>Today's snapshot for your restaurant</p>

      {isLoading ? (
        <div style={{ color: '#94a3b8' }}>Loading analytics…</div>
      ) : analytics ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard icon="💰" label="Revenue Today" value={`₹${parseFloat(analytics.revenue_today).toFixed(0)}`} color="#16A34A" />
            <StatCard icon="📋" label="Orders Today" value={analytics.orders_today} color="#2563EB" />
            <StatCard icon="🍽" label="Most Ordered" value={analytics.top_dish?.name || '—'} color="#C8A84B" />
            <StatCard icon="📊" label="Avg Order Value" value={`₹${parseFloat(analytics.avg_order_value).toFixed(0)}`} color="#7C3AED" />
          </div>

          {/* Revenue chart (simple bars) */}
          {analytics.revenue_last_7_days?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>Revenue — Last 7 Days</h2>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                {analytics.revenue_last_7_days.map((d, i) => {
                  const max = Math.max(...analytics.revenue_last_7_days.map(x => parseFloat(x.revenue)));
                  const h = max > 0 ? (parseFloat(d.revenue) / max) * 100 : 0;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>₹{parseFloat(d.revenue).toFixed(0)}</div>
                      <div style={{ width: '100%', height: `${h}%`, background: '#C8A84B', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ color: '#94a3b8' }}>No data yet. Start accepting orders!</div>
      )}
    </div>
  );
}
