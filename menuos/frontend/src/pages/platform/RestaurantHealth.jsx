import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };

const getHealthColor = (score) => {
  if (score >= 90) return '#16A34A';
  if (score >= 70) return '#C8A84B';
  return '#dc2626';
};

const getHealthLabel = (score) => {
  if (score >= 90) return 'Healthy';
  if (score >= 70) return 'Warning';
  return 'Critical';
};

export default function RestaurantHealth() {
  const [threshold, setThreshold] = useState('80');
  const [planFilter, setPlanFilter] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const { data: healthData = [], isLoading } = useQuery({
    queryKey: ['restaurant-health', threshold, planFilter],
    queryFn: () => platformApi.getRestaurantHealth({ threshold, plan: planFilter }),
  });

  const { data: stats } = useQuery({
    queryKey: ['health-stats'],
    queryFn: platformApi.getHealthStats,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['health-detail', selectedRestaurant?.id],
    queryFn: () => platformApi.getRestaurantHealthDetail(selectedRestaurant.id),
    enabled: !!selectedRestaurant,
  });

  const atRiskCount = healthData.filter(h => h.at_risk).length;

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>🏥 Restaurant Health</h1>
          <p style={{ color: '#64748b' }}>Monitor plan limits and resource usage</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
          <select
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
          >
            <option value="90">Health Score &lt; 90</option>
            <option value="80">Health Score &lt; 80</option>
            <option value="70">Health Score &lt; 70</option>
            <option value="50">Health Score &lt; 50</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{healthData.length}</div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Total Restaurants</div>
        </div>
        <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#16A34A' }}>
            {healthData.filter(h => h.health_score >= 90).length}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Healthy</div>
        </div>
        <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#C8A84B' }}>
            {healthData.filter(h => h.health_score >= 70 && h.health_score < 90).length}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Warning</div>
        </div>
        <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>
            {healthData.filter(h => h.health_score < 70).length}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Critical</div>
        </div>
        <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: atRiskCount > 0 ? '#dc2626' : '#16A34A' }}>
            {atRiskCount}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>At Risk</div>
        </div>
      </div>

      {/* At Risk Restaurants */}
      {stats?.at_risk && stats.at_risk.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#dc2626' }}>🚨 Approaching Limits</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {stats.at_risk.map((restaurant) => {
              const pct = Math.round((restaurant.menu_items / restaurant.item_limit) * 100);
              return (
                <div key={restaurant.id} style={{ background: '#450a0a', padding: 16, borderRadius: 8, minWidth: 250 }}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{restaurant.name}</div>
                  <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 8 }}>{restaurant.subscription_plan} plan</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#7f1d1d', borderRadius: 3 }}>
                      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: '#dc2626', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>
                    {restaurant.menu_items} / {restaurant.item_limit} items
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Health Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Restaurant', 'Plan', 'Health', 'Menu Items', 'Categories', 'Staff', 'Tables', 'Media', 'Warnings', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {healthData.map((restaurant) => {
                const healthColor = getHealthColor(restaurant.health_score);
                return (
                  <tr key={restaurant.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{restaurant.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{restaurant.slug}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: PLAN_COLORS[restaurant.subscription_plan],
                        color: '#fff',
                        textTransform: 'capitalize'
                      }}>
                        {restaurant.subscription_plan}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: `${healthColor}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                          color: healthColor
                        }}>
                          {restaurant.health_score}
                        </div>
                        <span style={{ fontSize: 12, color: healthColor }}>{getHealthLabel(restaurant.health_score)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <UsageBar pct={restaurant.usage.menu_items.pct} count={restaurant.usage.menu_items.count} limit={restaurant.usage.menu_items.limit} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <UsageBar pct={restaurant.usage.categories.pct} count={restaurant.usage.categories.count} limit={restaurant.usage.categories.limit} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <UsageBar pct={restaurant.usage.staff.pct} count={restaurant.usage.staff.count} limit={restaurant.usage.staff.limit} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <UsageBar pct={restaurant.usage.tables.pct} count={restaurant.usage.tables.count} limit={restaurant.usage.tables.limit} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <UsageBar pct={restaurant.usage.media.pct} count={restaurant.usage.media.count} limit={restaurant.usage.media.limit} unit="MB" />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {restaurant.warnings.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {restaurant.warnings.slice(0, 2).map((w, i) => (
                            <span key={i} style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: w.type === 'critical' ? '#fecaca' : '#fef3c7',
                              color: w.type === 'critical' ? '#991b1b' : '#92400e'
                            }}>
                              {w.type === 'critical' ? '⚠️' : '⚡'} {w.resource}
                            </span>
                          ))}
                          {restaurant.warnings.length > 2 && (
                            <span style={{ fontSize: 11, color: '#64748b' }}>+{restaurant.warnings.length - 2} more</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#16A34A' }}>✓ All good</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => setSelectedRestaurant(restaurant)}
                        style={{
                          padding: '6px 12px',
                          background: '#334155',
                          border: 'none',
                          borderRadius: 6,
                          color: '#e2e8f0',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRestaurant && detail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 32
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: 16,
            padding: 32,
            width: '100%',
            maxWidth: 700,
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {detailLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{detail.restaurant.name}</h2>
                    <p style={{ color: '#64748b' }}>{detail.restaurant.owner.name} • {detail.restaurant.owner.email}</p>
                  </div>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: `${getHealthColor(detail.health_score)}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    color: getHealthColor(detail.health_score)
                  }}>
                    {detail.health_score}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {Object.entries(detail.metrics).map(([key, metric]) => (
                    <div key={key} style={{ background: '#0f172a', padding: 16, borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize', marginBottom: 4 }}>{key.replace('_', ' ')}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {metric.used}{metric.pct >= 90 ? ' ⚠️' : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>of {metric.limit} ({metric.pct}%)</div>
                      <div style={{ marginTop: 8, height: 4, background: '#334155', borderRadius: 2 }}>
                        <div style={{
                          width: `${Math.min(100, metric.pct)}%`,
                          height: '100%',
                          background: metric.pct >= 90 ? '#dc2626' : metric.pct >= 75 ? '#C8A84B' : '#16A34A',
                          borderRadius: 2
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Activity */}
                <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>Recent Activity</h3>
                  <div style={{ display: 'flex', gap: 32 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{detail.activity.orders_7d}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Orders (7 days)</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{detail.activity.orders_30d}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Orders (30 days)</div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {detail.recommendations.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>💡 Recommendations</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {detail.recommendations.map((rec, i) => (
                        <div key={i} style={{
                          padding: 12,
                          background: rec.priority === 'high' ? '#450a0a' : '#1e3a5f',
                          borderRadius: 8,
                          borderLeft: `3px solid ${rec.priority === 'high' ? '#dc2626' : '#3b82f6'}`
                        }}>
                          <div style={{ fontSize: 13, color: '#e2e8f0' }}>{rec.message}</div>
                          {rec.suggested_plan && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>Suggested:</span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                background: PLAN_COLORS[rec.suggested_plan],
                                color: '#fff',
                                textTransform: 'capitalize'
                              }}>
                                {rec.suggested_plan}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setSelectedRestaurant(null)}
                  style={{
                    padding: '12px 24px',
                    background: '#334155',
                    border: 'none',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UsageBar({ pct, count, limit, unit = '' }) {
  const color = pct >= 90 ? '#dc2626' : pct >= 75 ? '#C8A84B' : '#16A34A';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{pct}%</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>{count}{unit} / {limit}{unit}</span>
      </div>
      <div style={{ width: 60, height: 6, background: '#334155', borderRadius: 3 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}
