import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/queries.js';

export default function Reports() {
  const { slug } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['reports-summary', slug],
    queryFn: () => reportsApi.getSummary(slug),
  });

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ['reports-daily', slug],
    queryFn: () => reportsApi.getDaily(slug, { days: 7 }),
    enabled: activeTab === 'daily',
  });

  const { data: monthly, isLoading: monthlyLoading } = useQuery({
    queryKey: ['reports-monthly', slug],
    queryFn: () => reportsApi.getMonthly(slug, { months: 12 }),
    enabled: activeTab === 'monthly',
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['reports-items', slug],
    queryFn: () => reportsApi.getItems(slug, { period: 'month' }),
    enabled: activeTab === 'items',
  });

  const handleExport = async (type) => {
    try {
      const params = {
        type,
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
        format: 'csv',
      };
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/restaurants/${slug}/reports/export?${new URLSearchParams(params)}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. Please try again.');
    }
  };

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toFixed(0)}`;

  const StatCard = ({ label, value, icon, color }) => (
    <div style={{
      background: '#1e293b',
      borderRadius: 12,
      padding: isMobile ? 16 : 20,
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
      </div>
      <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );

  if (summaryLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading reports...</div>;
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>📊 Reports & Analytics</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => handleExport('orders')} style={exportBtn}>📥 Orders</button>
          <button onClick={() => handleExport('items')} style={exportBtn}>📥 Items</button>
          <button onClick={() => handleExport('daily')} style={exportBtn}>📥 Daily</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'daily', label: 'Daily', icon: '📅' },
          { id: 'monthly', label: 'Monthly', icon: '📆' },
          { id: 'items', label: 'Items', icon: '🍽' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === tab.id ? '#C8A84B' : '#1e293b',
              color: activeTab === tab.id ? '#fff' : '#94a3b8',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && summary && (
        <div>
          {/* Today Stats */}
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#94a3b8' }}>Today</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard label="Orders" value={summary.today?.order_count || 0} icon="📦" color="#C8A84B" />
            <StatCard label="Revenue" value={formatCurrency(summary.today?.total_revenue)} icon="💰" color="#16A34A" />
            <StatCard label="Discounts" value={formatCurrency(summary.today?.total_discounts)} icon="🏷️" color="#ef4444" />
          </div>

          {/* This Month Stats */}
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#94a3b8' }}>This Month</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard label="Orders" value={summary.thisMonth?.order_count || 0} icon="📦" color="#2563EB" />
            <StatCard label="Revenue" value={formatCurrency(summary.thisMonth?.total_revenue)} icon="💰" color="#16A34A" />
            <StatCard label="Customers" value={summary.thisMonth?.unique_customers || 0} icon="👥" color="#7C3AED" />
            <StatCard label="Discounts" value={formatCurrency(summary.thisMonth?.total_discounts)} icon="🏷️" color="#ef4444" />
          </div>

          {/* This Year Stats */}
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#94a3b8' }}>This Year</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard label="Orders" value={summary.thisYear?.order_count || 0} icon="📦" color="#D97706" />
            <StatCard label="Revenue" value={formatCurrency(summary.thisYear?.total_revenue)} icon="💰" color="#16A34A" />
            <StatCard label="Customers" value={summary.thisYear?.unique_customers || 0} icon="👥" color="#7C3AED" />
          </div>

          {/* Top Items */}
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#94a3b8' }}>🏆 Top Selling Items (This Month)</h2>
          <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Qty</th>
                  <th style={thStyle}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {summary.topItems?.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{item.name}</td>
                    <td style={tdStyle}>{item.total_quantity}</td>
                    <td style={{ ...tdStyle, color: '#16A34A' }}>{formatCurrency(item.total_revenue)}</td>
                  </tr>
                ))}
                {(!summary.topItems || summary.topItems.length === 0) && (
                  <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: 20 }}>No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily Tab */}
      {activeTab === 'daily' && daily && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#94a3b8' }}>📅 Daily Breakdown (Last 7 Days)</h2>
          <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Orders</th>
                  <th style={thStyle}>Revenue</th>
                  <th style={thStyle}>Discounts</th>
                  <th style={thStyle}>Customers</th>
                  <th style={thStyle}>Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {daily.dailyBreakdown?.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={tdStyle}>{new Date(row.date).toLocaleDateString()}</td>
                    <td style={tdStyle}>{row.order_count}</td>
                    <td style={{ ...tdStyle, color: '#16A34A' }}>{formatCurrency(row.revenue)}</td>
                    <td style={{ ...tdStyle, color: '#ef4444' }}>{formatCurrency(row.discounts)}</td>
                    <td style={tdStyle}>{row.customers}</td>
                    <td style={tdStyle}>{formatCurrency(row.avg_order_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, marginTop: 32, color: '#94a3b8' }}>⏰ Hourly Distribution (Today)</h2>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
              {Array.from({ length: 24 }, (_, hour) => {
                const data = daily.hourlyBreakdown?.find(h => parseInt(h.hour) === hour);
                const maxOrders = Math.max(...(daily.hourlyBreakdown?.map(h => parseInt(h.order_count)) || [1]));
                const height = data ? (parseInt(data.order_count) / maxOrders) * 100 : 0;
                return (
                  <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '100%',
                      height: Math.max(height, 2),
                      background: '#C8A84B',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s',
                    }} />
                    {hour % 6 === 0 && (
                      <span style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{hour}:00</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Tab */}
      {activeTab === 'monthly' && monthly && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#94a3b8' }}>📆 Monthly Breakdown</h2>
          <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  <th style={thStyle}>Month</th>
                  <th style={thStyle}>Orders</th>
                  <th style={thStyle}>Revenue</th>
                  <th style={thStyle}>Discounts</th>
                  <th style={thStyle}>Customers</th>
                  <th style={thStyle}>Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {monthly.monthlyBreakdown?.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={tdStyle}>{row.month_name}</td>
                    <td style={tdStyle}>{row.order_count}</td>
                    <td style={{ ...tdStyle, color: '#16A34A' }}>{formatCurrency(row.revenue)}</td>
                    <td style={{ ...tdStyle, color: '#ef4444' }}>{formatCurrency(row.discounts)}</td>
                    <td style={tdStyle}>{row.customers}</td>
                    <td style={tdStyle}>{formatCurrency(row.avg_order_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, marginTop: 32, color: '#94a3b8' }}>📁 Category Performance</h2>
          <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Orders</th>
                  <th style={thStyle}>Items Sold</th>
                  <th style={thStyle}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {monthly.categoryBreakdown?.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={tdStyle}>{row.category}</td>
                    <td style={tdStyle}>{row.order_count}</td>
                    <td style={tdStyle}>{row.items_sold}</td>
                    <td style={{ ...tdStyle, color: '#16A34A' }}>{formatCurrency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && items && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#94a3b8' }}>🍽 Item Performance (This Month)</h2>
          <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Qty Sold</th>
                  <th style={thStyle}>Revenue</th>
                  <th style={thStyle}>Orders</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={tdStyle}>{item.name}</td>
                    <td style={tdStyle}>{item.category || 'N/A'}</td>
                    <td style={tdStyle}>{item.total_quantity}</td>
                    <td style={{ ...tdStyle, color: '#16A34A' }}>{formatCurrency(item.total_revenue)}</td>
                    <td style={tdStyle}>{item.order_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
};

const tdStyle = {
  padding: '12px 16px',
  fontSize: 14,
  color: '#e2e8f0',
};

const exportBtn = {
  background: '#16A34A',
  border: 'none',
  color: '#fff',
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};
