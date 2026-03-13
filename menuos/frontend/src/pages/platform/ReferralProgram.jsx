import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  converted: { bg: '#dcfce7', text: '#166534' },
  expired: { bg: '#fee2e2', text: '#991b1b' }
};

export default function ReferralProgram() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [rewardAmount, setRewardAmount] = useState(500);

  const { data: stats } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: platformApi.getReferralStats,
  });

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['referrals', statusFilter],
    queryFn: () => platformApi.getReferrals({ status: statusFilter }),
  });

  const convertMutation = useMutation({
    mutationFn: (id) => platformApi.markReferralConverted(id),
    onSuccess: () => qc.invalidateQueries(['referrals', 'referral-stats']),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, amount }) => platformApi.payReferralReward(id, amount),
    onSuccess: () => {
      qc.invalidateQueries(['referrals', 'referral-stats']);
      setSelectedReferral(null);
    },
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1400 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>🎁 Referral Program</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Manage referrals and rewards</p>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{stats.total_referrals || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Total Referrals</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#16A34A' }}>{stats.converted_count || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Converted</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#C8A84B' }}>{stats.total_referrers || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Referrers</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#16A34A' }}>{formatCurrency(stats.total_rewards_paid || 0)}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Rewards Paid</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{formatCurrency(stats.pending_rewards || 0)}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Pending Rewards</div>
          </div>
        </div>
      )}

      {/* Top Referrers */}
      {stats?.top_referrers && stats.top_referrers.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>🏆 Top Referrers</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {stats.top_referrers.slice(0, 5).map((referrer, idx) => (
              <div key={referrer.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0f172a', padding: 16, borderRadius: 8, minWidth: 250 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#C8A84B' }}>#{idx + 1}</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{referrer.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{referrer.converted_count} converted</div>
                  <div style={{ fontSize: 12, color: '#16A34A' }}>{formatCurrency(referrer.total_rewards)} earned</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="converted">Converted</option>
          <option value="expired">Expired</option>
        </select>
        <button
          onClick={() => setStatusFilter('')}
          style={{ padding: '10px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      {/* Referrals Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Referrer', 'Referred', 'Code', 'Status', 'Discount', 'Reward', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => {
                const statusColors = STATUS_COLORS[referral.status];
                return (
                  <tr key={referral.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{referral.referrer_name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{referral.referrer_slug}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{referral.referred_name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{referral.referred_slug}</div>
                      {referral.referred_plan && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 10,
                          background: referral.referred_plan === 'premium' ? '#7C3AED' : referral.referred_plan === 'pro' ? '#C8A84B' : '#2563EB',
                          color: '#fff'
                        }}>
                          {referral.referred_plan}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <code style={{ background: '#0f172a', padding: '4px 8px', borderRadius: 4, fontSize: 12, color: '#C8A84B' }}>
                        {referral.referral_code}
                      </code>
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
                        {referral.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#16A34A' }}>
                      {referral.discount_applied ? '✓ Applied' : '-'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {referral.reward_paid ? (
                        <span style={{ color: '#16A34A' }}>
                          ✓ {formatCurrency(referral.reward_paid_amount)}
                        </span>
                      ) : referral.status === 'converted' ? (
                        <span style={{ color: '#dc2626' }}>Pending</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {referral.status === 'pending' && (
                          <button
                            onClick={() => convertMutation.mutate(referral.id)}
                            disabled={convertMutation.isPending}
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
                            Mark Converted
                          </button>
                        )}
                        {referral.status === 'converted' && !referral.reward_paid && (
                          <button
                            onClick={() => setSelectedReferral(referral)}
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
                            Pay Reward
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

      {/* Pay Reward Modal */}
      {selectedReferral && (
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
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Pay Referral Reward</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>
              Pay reward to {selectedReferral.referrer_name} for referring {selectedReferral.referred_name}
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 8 }}>Reward Amount (₹)</label>
              <input
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 16
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => payMutation.mutate({ id: selectedReferral.id, amount: rewardAmount })}
                disabled={payMutation.isPending}
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
                Pay {formatCurrency(rewardAmount)}
              </button>
              <button
                onClick={() => setSelectedReferral(null)}
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
