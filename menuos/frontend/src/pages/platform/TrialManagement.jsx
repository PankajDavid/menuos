import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const STATUS_COLORS = {
  active: { bg: '#dcfce7', text: '#166534' },
  expired: { bg: '#fee2e2', text: '#991b1b' },
  converted: { bg: '#dbeafe', text: '#1e40af' }
};

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };

export default function TrialManagement() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: '', days: '' });
  const [selectedTrial, setSelectedTrial] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertPlan, setConvertPlan] = useState('pro');
  const [extendDays, setExtendDays] = useState(7);

  const { data: trials = [], isLoading } = useQuery({
    queryKey: ['trials', filters],
    queryFn: () => platformApi.getTrials(filters),
  });

  const { data: stats } = useQuery({
    queryKey: ['trial-stats'],
    queryFn: platformApi.getTrialStats,
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, plan }) => platformApi.convertTrial(id, plan),
    onSuccess: () => {
      qc.invalidateQueries(['trials', 'trial-stats']);
      setShowConvertModal(false);
      setSelectedTrial(null);
    },
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, days }) => platformApi.extendTrial(id, days),
    onSuccess: () => qc.invalidateQueries(['trials']),
  });

  const handleConvert = () => {
    if (selectedTrial) {
      convertMutation.mutate({ id: selectedTrial.id, plan: convertPlan });
    }
  };

  const handleExtend = (trial) => {
    extendMutation.mutate({ id: trial.id, days: extendDays });
  };

  const getDaysRemaining = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1400 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>🎯 Trial Management</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Track and convert trial users</p>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{stats.active_trials || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Active Trials</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{stats.expiring_soon || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Expiring Soon (7d)</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#16A34A' }}>{stats.converted_trials || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Converted</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#C8A84B' }}>{stats.conversion_rate || 0}%</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Conversion Rate</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#7C3AED' }}>{stats.recent_conversions || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Recent (30d)</div>
          </div>
        </div>
      )}

      {/* Conversion by Plan */}
      {stats?.by_plan && stats.by_plan.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Conversions by Plan</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {stats.by_plan.map((item) => (
              <div key={item.converted_to_plan} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  background: PLAN_COLORS[item.converted_to_plan],
                  color: '#fff',
                  textTransform: 'capitalize'
                }}>
                  {item.converted_to_plan}
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="converted">Converted</option>
        </select>
        <select
          value={filters.days}
          onChange={(e) => setFilters({ ...filters, days: e.target.value })}
          style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
        >
          <option value="">All Time</option>
          <option value="7">Expiring in 7 days</option>
          <option value="14">Expiring in 14 days</option>
          <option value="30">Expiring in 30 days</option>
        </select>
        <button
          onClick={() => setFilters({ status: '', days: '' })}
          style={{ padding: '10px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      {/* Trials Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Restaurant', 'Started', 'Expires', 'Status', 'Days Left', 'Source', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trials.map((trial) => {
                const daysLeft = getDaysRemaining(trial.expires_at);
                const statusColors = STATUS_COLORS[trial.trial_status];
                
                return (
                  <tr key={trial.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{trial.restaurant_name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{trial.restaurant_slug}</div>
                      {trial.converted_to_plan && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 10,
                          background: PLAN_COLORS[trial.converted_to_plan],
                          color: '#fff'
                        }}>
                          → {trial.converted_to_plan}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 13 }}>
                      {new Date(trial.started_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 13 }}>
                      {new Date(trial.expires_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: statusColors.bg,
                        color: statusColors.text,
                        textTransform: 'capitalize'
                      }}>
                        {trial.trial_status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {trial.trial_status === 'active' ? (
                        <span style={{ 
                          fontWeight: 600, 
                          color: daysLeft <= 3 ? '#dc2626' : daysLeft <= 7 ? '#ea580c' : '#16A34A' 
                        }}>
                          {daysLeft} days
                        </span>
                      ) : (
                        <span style={{ color: '#64748b' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, background: '#334155', color: '#e2e8f0', textTransform: 'capitalize' }}>
                        {trial.source}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {trial.trial_status === 'active' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedTrial(trial);
                                setShowConvertModal(true);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#16A34A',
                                border: 'none',
                                borderRadius: 6,
                                color: '#fff',
                                fontSize: 12,
                                cursor: 'pointer'
                              }}
                            >
                              Convert
                            </button>
                            <button
                              onClick={() => handleExtend(trial)}
                              disabled={extendMutation.isPending}
                              style={{
                                padding: '6px 12px',
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: 6,
                                color: '#fff',
                                fontSize: 12,
                                cursor: 'pointer'
                              }}
                            >
                              +{extendDays}d
                            </button>
                          </>
                        )}
                        {trial.trial_status === 'expired' && (
                          <button
                            onClick={() => {
                              setSelectedTrial(trial);
                              setShowConvertModal(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#7C3AED',
                              border: 'none',
                              borderRadius: 6,
                              color: '#fff',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                          >
                            Convert
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Convert Modal */}
      {showConvertModal && selectedTrial && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: 16,
            padding: 32,
            width: '100%',
            maxWidth: 400
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Convert Trial</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>
              Convert {selectedTrial.restaurant_name} to a paid plan
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 8 }}>Select Plan</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['basic', 'pro', 'premium'].map(plan => (
                  <button
                    key={plan}
                    onClick={() => setConvertPlan(plan)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: convertPlan === plan ? PLAN_COLORS[plan] : '#334155',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {plan}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleConvert}
                disabled={convertMutation.isPending}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#16A34A',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Convert to {convertPlan}
              </button>
              <button
                onClick={() => setShowConvertModal(false)}
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
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
