import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };
const PLAN_PRICES = { free: 0, basic: 999, pro: 2499, premium: 4999 };

export default function RevenueAnalytics() {
  const [period, setPeriod] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['revenue-analytics', period],
    queryFn: () => platformApi.getRevenueAnalytics(period),
  });

  const { data: mrrHistory, isLoading: mrrLoading } = useQuery({
    queryKey: ['mrr-history'],
    queryFn: () => platformApi.getMrrHistory(6),
    enabled: activeTab === 'mrr',
  });

  const { data: upgrades, isLoading: upgradesLoading } = useQuery({
    queryKey: ['upgrade-analysis', period],
    queryFn: () => platformApi.getUpgradeAnalysis(period),
    enabled: activeTab === 'upgrades',
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (analyticsLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>💰 Revenue Analytics</h1>
          <p style={{ color: '#64748b' }}>MRR, churn, and upgrade insights</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {['overview', 'mrr', 'upgrades'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab ? '#C8A84B' : '#1e293b',
              color: activeTab === tab ? '#0f172a' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && analytics && (
        <div>
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#16A34A' }}>{formatCurrency(analytics.current_mrr)}</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Current MRR</div>
            </div>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#C8A84B' }}>{formatCurrency(analytics.arpu)}</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>ARPU</div>
            </div>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: analytics.churn_rate > 5 ? '#dc2626' : '#16A34A' }}>
                {analytics.churn_rate}%
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Churn Rate</div>
            </div>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>{analytics.summary.total_paid_customers}</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Paid Customers</div>
            </div>
          </div>

          {/* MRR by Plan */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>MRR by Plan</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {Object.entries(analytics.by_plan).map(([plan, data]) => (
                <div key={plan} style={{ background: '#0f172a', padding: 20, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background: PLAN_COLORS[plan],
                      color: '#fff',
                      textTransform: 'capitalize'
                    }}>
                      {plan}
                    </span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                    {formatCurrency(data.mrr)}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {data.customers} customers @ ₹{PLAN_PRICES[plan]}/mo
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Movement */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Customer Movement (Last {period} days)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              <div style={{ textAlign: 'center', padding: 20, background: '#052e16', borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>+{analytics.summary.new_customers}</div>
                <div style={{ color: '#86efac', fontSize: 13 }}>New Customers</div>
              </div>
              <div style={{ textAlign: 'center', padding: 20, background: '#450a0a', borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>-{analytics.summary.churned_customers}</div>
                <div style={{ color: '#fca5a5', fontSize: 13 }}>Churned</div>
              </div>
              <div style={{ textAlign: 'center', padding: 20, background: '#0f172a', borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: analytics.summary.new_customers - analytics.summary.churned_customers >= 0 ? '#16A34A' : '#dc2626' }}>
                  {analytics.summary.new_customers - analytics.summary.churned_customers >= 0 ? '+' : ''}
                  {analytics.summary.new_customers - analytics.summary.churned_customers}
                </div>
                <div style={{ color: '#64748b', fontSize: 13 }}>Net Growth</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mrr' && (
        <div>
          {mrrLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading MRR history...</div>
          ) : mrrHistory && mrrHistory.length > 0 ? (
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>MRR History (6 months)</h2>
              <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 4, padding: '20px 0' }}>
                {mrrHistory.map((point, index) => {
                  const maxMrr = Math.max(...mrrHistory.map(h => h.mrr || h.total_mrr || 0));
                  const value = point.mrr || point.total_mrr || 0;
                  const height = maxMrr > 0 ? (value / maxMrr) * 100 : 0;
                  
                  return (
                    <div
                      key={index}
                      style={{
                        flex: 1,
                        height: `${height}%`,
                        background: '#16A34A',
                        borderRadius: '4px 4px 0 0',
                        minHeight: 4,
                        position: 'relative'
                      }}
                      title={`${point.date || point.snapshot_date}: ${formatCurrency(value)}`}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#64748b' }}>
                <span>{mrrHistory[0]?.date || mrrHistory[0]?.snapshot_date}</span>
                <span>{mrrHistory[mrrHistory.length - 1]?.date || mrrHistory[mrrHistory.length - 1]?.snapshot_date}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: 12 }}>
              No MRR history data available yet
            </div>
          )}
        </div>
      )}

      {activeTab === 'upgrades' && upgrades && (
        <div>
          {upgradesLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading upgrade analysis...</div>
          ) : (
            <div>
              {/* Revenue Impact */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                <div style={{ background: '#1e293b', padding: 24, borderRadius: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#16A34A' }}>{formatCurrency(upgrades.upgrade_revenue)}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Upgrade Revenue</div>
                </div>
                <div style={{ background: '#1e293b', padding: 24, borderRadius: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{formatCurrency(upgrades.downgrade_loss)}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Downgrade Loss</div>
                </div>
                <div style={{ background: '#1e293b', padding: 24, borderRadius: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: upgrades.net_revenue_impact >= 0 ? '#16A34A' : '#dc2626' }}>
                    {upgrades.net_revenue_impact >= 0 ? '+' : ''}{formatCurrency(upgrades.net_revenue_impact)}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Net Impact</div>
                </div>
              </div>

              {/* Upgrade Paths */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#16A34A' }}>⬆️ Upgrades</h3>
                  {upgrades.upgrades.length > 0 ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {upgrades.upgrades.map((upgrade, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#0f172a', borderRadius: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: PLAN_COLORS[upgrade.previous_plan], color: '#fff', textTransform: 'capitalize' }}>
                              {upgrade.previous_plan}
                            </span>
                            <span>→</span>
                            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: PLAN_COLORS[upgrade.new_plan], color: '#fff', textTransform: 'capitalize' }}>
                              {upgrade.new_plan}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{upgrade.count}x</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>avg {formatCurrency(upgrade.avg_amount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No upgrades in this period</div>
                  )}
                </div>

                <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#dc2626' }}>⬇️ Downgrades</h3>
                  {upgrades.downgrades.length > 0 ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {upgrades.downgrades.map((downgrade, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#0f172a', borderRadius: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: PLAN_COLORS[downgrade.previous_plan], color: '#fff', textTransform: 'capitalize' }}>
                              {downgrade.previous_plan}
                            </span>
                            <span>→</span>
                            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: PLAN_COLORS[downgrade.new_plan], color: '#fff', textTransform: 'capitalize' }}>
                              {downgrade.new_plan}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{downgrade.count}x</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No downgrades in this period</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
