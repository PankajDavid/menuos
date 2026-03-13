import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';
import { useAuthStore } from '../../store/authStore.js';
import { useNavigate, Link } from 'react-router-dom';
import PlanLimits from './PlanLimits.jsx';
import FeatureFlags from './FeatureFlags.jsx';
import Geography from './Geography.jsx';
import EmailTemplates from './EmailTemplates.jsx';
import Announcements from './Announcements.jsx';
import SupportTickets from './SupportTickets.jsx';
import Onboarding from './Onboarding.jsx';
import TrialManagement from './TrialManagement.jsx';
import RevenueAnalytics from './RevenueAnalytics.jsx';
import ReferralProgram from './ReferralProgram.jsx';
import InAppMessaging from './InAppMessaging.jsx';
import FailedPayments from './FailedPayments.jsx';

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };

export default function PlatformAdmin() {
  const qc = useQueryClient();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('restaurants');
  const [userFilter, setUserFilter] = useState({ search: '', role: '', status: '' });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showPlanLimits, setShowPlanLimits] = useState(false);
  const [showFeatureFlags, setShowFeatureFlags] = useState(false);
  const [showGeography, setShowGeography] = useState(false);
  const [showEmailTemplates, setShowEmailTemplates] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showSupportTickets, setShowSupportTickets] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTrialManagement, setShowTrialManagement] = useState(false);
  const [showRevenueAnalytics, setShowRevenueAnalytics] = useState(false);
  const [showReferralProgram, setShowReferralProgram] = useState(false);
  const [showInAppMessaging, setShowInAppMessaging] = useState(false);
  const [showFailedPayments, setShowFailedPayments] = useState(false);

  const { data: analytics } = useQuery({ queryKey: ['platform-analytics'], queryFn: platformApi.getAnalytics });
  const { data: restaurants = [] } = useQuery({ queryKey: ['platform-restaurants'], queryFn: platformApi.getRestaurants });
  const { data: users = [] } = useQuery({ queryKey: ['platform-users'], queryFn: platformApi.getUsers, enabled: activeTab === 'users' });
  const { data: invoices = [] } = useQuery({ queryKey: ['platform-invoices'], queryFn: platformApi.getInvoices, enabled: activeTab === 'invoices' });
  const { data: discounts = [] } = useQuery({ queryKey: ['platform-discounts'], queryFn: platformApi.getDiscounts, enabled: activeTab === 'discounts' });
  const { data: activityLogs = [] } = useQuery({ queryKey: ['activity-logs'], queryFn: () => platformApi.getActivityLogs({ limit: 100 }), enabled: activeTab === 'activity' });
  const { data: activitySummary } = useQuery({ queryKey: ['activity-summary'], queryFn: platformApi.getActivitySummary, enabled: activeTab === 'activity' });
  const { data: popularItems = [] } = useQuery({ queryKey: ['popular-items'], queryFn: platformApi.getPopularItems, enabled: activeTab === 'analytics' });

  const planMutation = useMutation({
    mutationFn: ({ id, plan }) => platformApi.updatePlan(id, plan),
    onSuccess: () => qc.invalidateQueries(['platform-restaurants']),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => platformApi.toggle(id),
    onSuccess: () => qc.invalidateQueries(['platform-restaurants']),
  });

  const payInvoiceMutation = useMutation({
    mutationFn: ({ id, payment_method }) => platformApi.payInvoice(id, { payment_method }),
    onSuccess: () => qc.invalidateQueries(['platform-invoices']),
  });

  const createDiscountMutation = useMutation({
    mutationFn: (data) => platformApi.createDiscount(data),
    onSuccess: () => qc.invalidateQueries(['platform-discounts']),
  });

  const checkSubscriptionsMutation = useMutation({
    mutationFn: () => platformApi.checkSubscriptions(),
    onSuccess: () => qc.invalidateQueries(['platform-restaurants', 'platform-analytics']),
  });

  const bulkUpdateRoleMutation = useMutation({
    mutationFn: ({ userIds, role }) => platformApi.bulkUpdateUserRoles(userIds, role),
    onSuccess: () => {
      qc.invalidateQueries(['platform-users']);
      setSelectedUsers([]);
    },
  });

  const bulkActivateMutation = useMutation({
    mutationFn: ({ userIds, isActive }) => platformApi.bulkActivateUsers(userIds, isActive),
    onSuccess: () => {
      qc.invalidateQueries(['platform-users']);
      setSelectedUsers([]);
    },
  });

  const handleExport = async (type) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/platform/export/${type}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: '#C8A84B' }}>🍽 MenuOS — Platform Admin</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => handleExport('restaurants')} style={{ background: '#16A34A', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>📥 Export Restaurants</button>
          <button onClick={() => handleExport('orders')} style={{ background: '#2563EB', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>📥 Export Orders</button>
          <button onClick={() => setShowPlanLimits(!showPlanLimits)} style={{ background: '#7C3AED', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>⚙️ Plan Limits</button>
          <button onClick={() => setShowFeatureFlags(!showFeatureFlags)} style={{ background: '#0891b2', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>🚦 Feature Flags</button>
          <button onClick={() => setShowGeography(!showGeography)} style={{ background: '#059669', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>🌍 Geography</button>
          <button onClick={() => setShowEmailTemplates(!showEmailTemplates)} style={{ background: '#ea580c', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>📧 Email Templates</button>
          <button onClick={() => setShowAnnouncements(!showAnnouncements)} style={{ background: '#7c3aed', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>📢 Announcements</button>
          <button onClick={() => setShowSupportTickets(!showSupportTickets)} style={{ background: '#db2777', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>🎫 Support Tickets</button>
          <button onClick={() => setShowOnboarding(!showOnboarding)} style={{ background: '#0891b2', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>✅ Onboarding</button>
          <button onClick={() => setShowTrialManagement(!showTrialManagement)} style={{ background: '#059669', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>🎯 Trials</button>
          <button onClick={() => setShowRevenueAnalytics(!showRevenueAnalytics)} style={{ background: '#d97706', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>💰 Revenue</button>
          <button onClick={() => setShowReferralProgram(!showReferralProgram)} style={{ background: '#db2777', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>🎁 Referrals</button>
          <button onClick={() => setShowInAppMessaging(!showInAppMessaging)} style={{ background: '#0891b2', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>💬 Messages</button>
          <button onClick={() => setShowFailedPayments(!showFailedPayments)} style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>💳 Failed</button>
          <Link to="/r/pankys/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, padding: '7px 16px', border: '1px solid #334155', borderRadius: 8 }}>🏪 My Restaurant</Link>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '7px 16px', borderRadius: 8, cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      {showPlanLimits ? (
        <PlanLimits />
      ) : (
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

        {/* Revenue Chart */}
        {analytics?.revenue_by_month && analytics.revenue_by_month.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 32 }}>
            <h2 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Monthly Revenue (Last 6 Months)</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 150 }}>
              {[...analytics.revenue_by_month].reverse().map((month, idx) => {
                const maxRevenue = Math.max(...analytics.revenue_by_month.map(m => parseFloat(m.revenue)));
                const height = maxRevenue > 0 ? (parseFloat(month.revenue) / maxRevenue) * 120 : 0;
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: '#C8A84B', marginBottom: 4 }}>₹{(parseFloat(month.revenue) / 1000).toFixed(0)}k</div>
                    <div style={{ width: '100%', height: `${height}px`, background: '#C8A84B', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>{new Date(month.month).toLocaleDateString('en-US', { month: 'short' })}</div>
                  </div>
                );
              })}
            </div>
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

        {/* At-Risk Restaurants */}
        {analytics?.at_risk_restaurants && analytics.at_risk_restaurants.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 32, border: '1px solid #dc2626' }}>
            <h2 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: '#ef4444' }}>⚠️ At-Risk Restaurants (No orders in 30 days)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Restaurant</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Owner</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Plan</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Last Order</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.at_risk_restaurants.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px 12px', fontSize: 13 }}>{r.name}</td>
                      <td style={{ padding: '8px 12px', fontSize: 13, color: '#94a3b8' }}>{r.owner_email}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: PLAN_COLORS[r.subscription_plan], color: '#fff' }}>
                          {r.subscription_plan}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 13, color: '#ef4444' }}>
                        {r.last_order_date ? new Date(r.last_order_date).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('restaurants')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'restaurants' ? '#C8A84B' : '#1e293b',
              color: activeTab === 'restaurants' ? '#0f172a' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🏪 Restaurants ({restaurants.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'users' ? '#C8A84B' : '#1e293b',
              color: activeTab === 'users' ? '#0f172a' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            👥 Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'invoices' ? '#C8A84B' : '#1e293b',
              color: activeTab === 'invoices' ? '#0f172a' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🧾 Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('discounts')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'discounts' ? '#C8A84B' : '#1e293b',
              color: activeTab === 'discounts' ? '#0f172a' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🎟️ Discounts ({discounts.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'activity' ? '#C8A84B' : '#1e293b',
              color: activeTab === 'activity' ? '#0f172a' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📋 Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'analytics' ? '#C8A84B' : '#1e293b',
              color: activeTab === 'analytics' ? '#0f172a' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📊 Global Analytics
          </button>
          <button
            onClick={() => checkSubscriptionsMutation.mutate()}
            disabled={checkSubscriptionsMutation.isPending}
            style={{
              padding: '10px 20px',
              background: '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: checkSubscriptionsMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: checkSubscriptionsMutation.isPending ? 0.6 : 1
            }}
          >
            🔄 Check Subscriptions
          </button>
        </div>

        {/* Restaurants table */}
        {activeTab === 'restaurants' && (
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>All Restaurants ({restaurants.length})</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Restaurant', 'Owner', 'Plan', 'Sub Status', 'Payment', 'Next Due', 'Orders', 'Revenue', 'Status', 'Actions'].map(h => (
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
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: r.subscription_status === 'active' ? '#dcfce7' : r.subscription_status === 'grace_period' ? '#fef3c7' : r.subscription_status === 'suspended' ? '#fee2e2' : '#f3f4f6', color: r.subscription_status === 'active' ? '#16A34A' : r.subscription_status === 'grace_period' ? '#92400e' : r.subscription_status === 'suspended' ? '#dc2626' : '#374151' }}>
                        {r.subscription_status || 'active'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: r.payment_status === 'paid' ? '#dcfce7' : r.payment_status === 'overdue' ? '#fee2e2' : '#fef3c7', color: r.payment_status === 'paid' ? '#16A34A' : r.payment_status === 'overdue' ? '#dc2626' : '#92400e' }}>
                        {r.payment_status || 'pending'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: r.next_payment_date && new Date(r.next_payment_date) < new Date() ? '#ef4444' : '#94a3b8', fontSize: 13 }}>
                      {r.next_payment_date ? new Date(r.next_payment_date).toLocaleDateString() : 'N/A'}
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
        )}

        {/* Users table */}
        {activeTab === 'users' && (
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>All Users ({users.length})</h2>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userFilter.search}
                onChange={(e) => setUserFilter({ ...userFilter, search: e.target.value })}
                style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14, minWidth: 200 }}
              />
              <select
                value={userFilter.role}
                onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value })}
                style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="kitchen">Kitchen</option>
              </select>
              <select
                value={userFilter.status}
                onChange={(e) => setUserFilter({ ...userFilter, status: e.target.value })}
                style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={() => setUserFilter({ search: '', role: '', status: '' })}
                style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: 6, color: '#e2e8f0', fontSize: 14, cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>
            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div style={{ display: 'flex', gap: 12, marginTop: 16, padding: '12px 16px', background: '#0f172a', borderRadius: 8, alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>{selectedUsers.length} selected</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      bulkUpdateRoleMutation.mutate({ userIds: selectedUsers, role: e.target.value });
                      e.target.value = '';
                    }
                  }}
                  style={{ padding: '6px 12px', background: '#334155', border: 'none', borderRadius: 6, color: '#e2e8f0', fontSize: 13 }}
                >
                  <option value="">Change Role to...</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="kitchen">Kitchen</option>
                </select>
                <button
                  onClick={() => bulkActivateMutation.mutate({ userIds: selectedUsers, isActive: true })}
                  disabled={bulkActivateMutation.isPending}
                  style={{ padding: '6px 12px', background: '#16A34A', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer' }}
                >
                  Activate
                </button>
                <button
                  onClick={() => bulkActivateMutation.mutate({ userIds: selectedUsers, isActive: false })}
                  disabled={bulkActivateMutation.isPending}
                  style={{ padding: '6px 12px', background: '#dc2626', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer' }}
                >
                  Deactivate
                </button>
                <button
                  onClick={() => setSelectedUsers([])}
                  style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        const filteredUsers = users.filter(u => {
                          const matchesSearch = !userFilter.search || 
                            u.name?.toLowerCase().includes(userFilter.search.toLowerCase()) ||
                            u.email?.toLowerCase().includes(userFilter.search.toLowerCase()) ||
                            u.restaurant_name?.toLowerCase().includes(userFilter.search.toLowerCase());
                          const matchesRole = !userFilter.role || u.role === userFilter.role;
                          const matchesStatus = !userFilter.status || (userFilter.status === 'active' ? u.is_active : !u.is_active);
                          return matchesSearch && matchesRole && matchesStatus;
                        });
                        setSelectedUsers(e.target.checked ? filteredUsers.map(u => u.id) : []);
                      }}
                      checked={selectedUsers.length > 0 && users.filter(u => {
                        const matchesSearch = !userFilter.search || 
                          u.name?.toLowerCase().includes(userFilter.search.toLowerCase()) ||
                          u.email?.toLowerCase().includes(userFilter.search.toLowerCase()) ||
                          u.restaurant_name?.toLowerCase().includes(userFilter.search.toLowerCase());
                        const matchesRole = !userFilter.role || u.role === userFilter.role;
                        const matchesStatus = !userFilter.status || (userFilter.status === 'active' ? u.is_active : !u.is_active);
                        return matchesSearch && matchesRole && matchesStatus;
                      }).length === selectedUsers.length}
                    />
                  </th>
                  {['User', 'Restaurant', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.filter(u => {
                  const matchesSearch = !userFilter.search || 
                    u.name?.toLowerCase().includes(userFilter.search.toLowerCase()) ||
                    u.email?.toLowerCase().includes(userFilter.search.toLowerCase()) ||
                    u.restaurant_name?.toLowerCase().includes(userFilter.search.toLowerCase());
                  const matchesRole = !userFilter.role || u.role === userFilter.role;
                  const matchesStatus = !userFilter.status || (userFilter.status === 'active' ? u.is_active : !u.is_active);
                  return matchesSearch && matchesRole && matchesStatus;
                }).map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, u.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                          }
                        }}
                      />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 14 }}>
                      {u.restaurant_name || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: u.role === 'admin' ? '#dbeafe' : u.role === 'kitchen' ? '#fef3c7' : '#f3f4f6', color: u.role === 'admin' ? '#1e40af' : u.role === 'kitchen' ? '#92400e' : '#374151' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: u.is_active ? '#dcfce7' : '#fee2e2', color: u.is_active ? '#16A34A' : '#dc2626' }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 13 }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <a href={`/r/${u.restaurant_slug}/admin`} target="_blank" rel="noreferrer"
                        style={{ padding: '5px 10px', background: '#1e40af', color: '#fff', borderRadius: 6, fontSize: 12, textDecoration: 'none' }}>View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Invoices table */}
        {activeTab === 'invoices' && (
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>All Invoices ({invoices.length})</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Invoice #', 'Restaurant', 'Plan', 'Amount', 'Discount', 'Final', 'Status', 'Due Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{inv.invoice_number}</td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{inv.restaurant_name}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: PLAN_COLORS[inv.plan], color: '#fff' }}>
                        {inv.plan}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>₹{parseFloat(inv.amount).toFixed(0)}</td>
                    <td style={{ padding: '14px 16px', color: '#22c55e' }}>₹{parseFloat(inv.discount_amount).toFixed(0)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#C8A84B' }}>₹{parseFloat(inv.final_amount).toFixed(0)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: inv.status === 'paid' ? '#dcfce7' : inv.status === 'overdue' ? '#fee2e2' : '#fef3c7', color: inv.status === 'paid' ? '#16A34A' : inv.status === 'overdue' ? '#dc2626' : '#92400e' }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{new Date(inv.due_date).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {inv.status === 'pending' && (
                        <button 
                          onClick={() => payInvoiceMutation.mutate({ id: inv.id, payment_method: 'manual' })}
                          disabled={payInvoiceMutation.isPending}
                          style={{ padding: '5px 10px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Discounts table */}
        {activeTab === 'discounts' && (
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Discount Codes ({discounts.length})</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Code', 'Name', 'Type', 'Value', 'Uses', 'Valid Period', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {discounts.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, fontFamily: 'monospace', background: '#334155', borderRadius: 4 }}>{d.code}</td>
                    <td style={{ padding: '14px 16px' }}>{d.name}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, textTransform: 'capitalize', background: d.discount_type === 'percentage' ? '#dbeafe' : d.discount_type === 'fixed' ? '#fef3c7' : '#dcfce7', color: d.discount_type === 'percentage' ? '#1e40af' : d.discount_type === 'fixed' ? '#92400e' : '#16A34A' }}>
                        {d.discount_type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {d.discount_type === 'percentage' ? `${d.discount_value}%` : d.discount_type === 'fixed' ? `₹${d.discount_value}` : `${d.discount_value} days`}
                    </td>
                    <td style={{ padding: '14px 16px' }}>{d.used_count}{d.max_uses ? `/${d.max_uses}` : ''}</td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 13 }}>
                      {new Date(d.valid_from).toLocaleDateString()} - {new Date(d.valid_until).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: d.is_active ? '#dcfce7' : '#fee2e2', color: d.is_active ? '#16A34A' : '#dc2626' }}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Activity Logs */}
        {activeTab === 'activity' && (
        <div>
          {/* Summary Cards */}
          {activitySummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Total Actions (30 days)</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#C8A84B' }}>
                  {activitySummary.by_action?.reduce((sum, a) => sum + parseInt(a.count), 0) || 0}
                </div>
              </div>
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Logins Today</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#16A34A' }}>
                  {activitySummary.by_day?.[0]?.count || 0}
                </div>
              </div>
            </div>
          )}

          <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Activity</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Time', 'User', 'Action', 'Entity', 'Restaurant', 'Details'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 13 }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{log.user_name || 'Unknown'}</div>
                        <div style={{ color: '#64748b', fontSize: 12 }}>{log.user_role}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: log.action === 'login' ? '#dcfce7' : '#dbeafe', color: log.action === 'login' ? '#16A34A' : '#1e40af', textTransform: 'capitalize' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                        {log.entity_type || '-'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                        {log.restaurant_name || '-'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 13 }}>
                        {log.details ? JSON.stringify(log.details).slice(0, 50) + '...' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Global Analytics - Popular Items */}
        {activeTab === 'analytics' && (
        <div>
          <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>🔥 Most Popular Menu Items Globally</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Rank', 'Item', 'Restaurant', 'Category', 'Price', 'Times Ordered', 'Qty Sold'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {popularItems.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#C8A84B' }}>#{index + 1}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{item.restaurant_name}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, background: '#334155', color: '#e2e8f0' }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#C8A84B', fontWeight: 600 }}>₹{item.price}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{item.times_ordered}</td>
                      <td style={{ padding: '14px 16px', color: '#16A34A', fontWeight: 600 }}>{item.total_quantity_sold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>
      )}

      {showPlanLimits && (
        <PlanLimits onClose={() => setShowPlanLimits(false)} />
      )}
      {showFeatureFlags && (
        <FeatureFlags onClose={() => setShowFeatureFlags(false)} />
      )}
      {showGeography && (
        <Geography onClose={() => setShowGeography(false)} />
      )}
      {showEmailTemplates && (
        <EmailTemplates onClose={() => setShowEmailTemplates(false)} />
      )}
      {showAnnouncements && (
        <Announcements onClose={() => setShowAnnouncements(false)} />
      )}
      {showSupportTickets && (
        <SupportTickets onClose={() => setShowSupportTickets(false)} />
      )}
      {showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}
      {showTrialManagement && (
        <TrialManagement onClose={() => setShowTrialManagement(false)} />
      )}
      {showRevenueAnalytics && (
        <RevenueAnalytics onClose={() => setShowRevenueAnalytics(false)} />
      )}
      {showReferralProgram && (
        <ReferralProgram onClose={() => setShowReferralProgram(false)} />
      )}
      {showInAppMessaging && (
        <InAppMessaging restaurants={restaurants} onClose={() => setShowInAppMessaging(false)} />
      )}
      {showFailedPayments && (
        <FailedPayments onClose={() => setShowFailedPayments(false)} />
      )}
    </div>
  );
}
