import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  dunning: { bg: '#fecaca', text: '#991b1b' },
  resolved: { bg: '#dcfce7', text: '#166534' },
  cancelled: { bg: '#e2e8f0', text: '#475569' }
};

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };

export default function FailedPayments() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [days, setDays] = useState('30');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: stats } = useQuery({
    queryKey: ['failed-payment-stats', days],
    queryFn: () => platformApi.getFailedPaymentStats(days),
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['failed-payments', statusFilter, days],
    queryFn: () => platformApi.getFailedPayments({ status: statusFilter, days }),
  });

  const { data: dunningReport } = useQuery({
    queryKey: ['dunning-report'],
    queryFn: platformApi.getDunningReport,
    enabled: activeTab === 'dunning',
  });

  const retryMutation = useMutation({
    mutationFn: (id) => platformApi.retryFailedPayment(id),
    onSuccess: () => qc.invalidateQueries(['failed-payments', 'failed-payment-stats']),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }) => platformApi.resolveFailedPayment(id, notes),
    onSuccess: () => {
      qc.invalidateQueries(['failed-payments', 'failed-payment-stats']);
      setSelectedPayment(null);
      setResolutionNotes('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, notes }) => platformApi.cancelFailedPayment(id, notes),
    onSuccess: () => {
      qc.invalidateQueries(['failed-payments', 'failed-payment-stats']);
      setSelectedPayment(null);
      setResolutionNotes('');
    },
  });

  const dunningMutation = useMutation({
    mutationFn: (id) => platformApi.moveToDunning(id),
    onSuccess: () => qc.invalidateQueries(['failed-payments', 'failed-payment-stats']),
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>💳 Failed Payments</h1>
          <p style={{ color: '#64748b' }}>Track and recover failed subscription payments</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {['overview', 'dunning'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab ? '#dc2626' : '#1e293b',
              color: activeTab === tab ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'dunning' ? '🚨 Dunning' : '📊 Overview'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
              <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{stats.total_failed || 0}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Total Failed</div>
              </div>
              <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#C8A84B' }}>{stats.pending_count || 0}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Pending</div>
              </div>
              <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{stats.dunning_count || 0}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>In Dunning</div>
              </div>
              <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#16A34A' }}>{stats.recovery_rate || 0}%</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Recovery Rate</div>
              </div>
              <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#16A34A' }}>{formatCurrency(stats.recovered_amount || 0)}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Recovered</div>
              </div>
              <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{formatCurrency(stats.lost_amount || 0)}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Lost</div>
              </div>
            </div>
          )}

          {/* Top Failure Reasons */}
          {stats?.top_failure_reasons && stats.top_failure_reasons.length > 0 && (
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>⚠️ Top Failure Reasons</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                {stats.top_failure_reasons.slice(0, 5).map((reason, idx) => (
                  <div key={idx} style={{ background: '#0f172a', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>{reason.failure_reason}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{reason.count}x</span>
                      <span style={{ fontSize: 14, color: '#dc2626' }}>{formatCurrency(reason.total_amount)}</span>
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
              <option value="dunning">Dunning</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={() => setStatusFilter('')}
              style={{ padding: '10px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>

          {/* Payments Table */}
          <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Restaurant', 'Amount', 'Plan', 'Status', 'Retries', 'Failure Reason', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const statusColors = STATUS_COLORS[payment.status];
                    return (
                      <tr key={payment.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{payment.restaurant_name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{payment.restaurant_email}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#e2e8f0' }}>
                          {formatCurrency(payment.amount)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            background: PLAN_COLORS[payment.plan],
                            color: '#fff',
                            textTransform: 'capitalize'
                          }}>
                            {payment.plan}
                          </span>
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
                            {payment.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#e2e8f0' }}>
                          {payment.retry_count}/{payment.max_retries}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 200 }}>
                            {payment.failure_reason || 'Unknown'}
                          </div>
                          {payment.error_code && (
                            <code style={{ fontSize: 11, color: '#64748b' }}>{payment.error_code}</code>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {payment.status === 'pending' && payment.retry_count < payment.max_retries && (
                              <button
                                onClick={() => retryMutation.mutate(payment.id)}
                                disabled={retryMutation.isPending}
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
                                Retry
                              </button>
                            )}
                            {payment.status === 'pending' && (
                              <button
                                onClick={() => dunningMutation.mutate(payment.id)}
                                disabled={dunningMutation.isPending}
                                style={{
                                  padding: '6px 12px',
                                  background: '#dc2626',
                                  border: 'none',
                                  borderRadius: 6,
                                  color: '#fff',
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                Dunning
                              </button>
                            )}
                            {(payment.status === 'pending' || payment.status === 'dunning') && (
                              <>
                                <button
                                  onClick={() => setSelectedPayment({ ...payment, action: 'resolve' })}
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
                                  Resolve
                                </button>
                                <button
                                  onClick={() => setSelectedPayment({ ...payment, action: 'cancel' })}
                                  style={{
                                    padding: '6px 12px',
                                    background: '#64748b',
                                    border: 'none',
                                    borderRadius: 6,
                                    color: '#fff',
                                    fontSize: 12,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cancel
                                </button>
                              </>
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
        </div>
      )}

      {activeTab === 'dunning' && dunningReport && (
        <div>
          {/* Dunning Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#dc2626' }}>{dunningReport.summary.total_in_dunning || 0}</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Accounts in Dunning</div>
            </div>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{formatCurrency(dunningReport.summary.total_at_risk || 0)}</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Total at Risk</div>
            </div>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#C8A84B' }}>{Math.round(dunningReport.summary.avg_days_in_dunning || 0)}d</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Avg Days in Dunning</div>
            </div>
          </div>

          {/* Dunning List */}
          <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: '1px solid #334155' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>🚨 Dunning Accounts</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Restaurant', 'Amount', 'Days in Dunning', 'Created', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dunningReport.dunning_payments?.map((payment) => (
                    <tr key={payment.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{payment.restaurant_name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{payment.restaurant_email}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#dc2626' }}>
                        {formatCurrency(payment.amount)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          background: payment.days_in_dunning > 7 ? '#dc2626' : '#C8A84B',
                          color: '#fff'
                        }}>
                          {Math.round(payment.days_in_dunning)} days
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                        {formatTime(payment.created_at)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setSelectedPayment({ ...payment, action: 'resolve' })}
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
                            Resolve
                          </button>
                          <button
                            onClick={() => setSelectedPayment({ ...payment, action: 'cancel' })}
                            style={{
                              padding: '6px 12px',
                              background: '#64748b',
                              border: 'none',
                              borderRadius: 6,
                              color: '#fff',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                          >
                            Cancel & Downgrade
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
      )}

      {/* Resolution Modal */}
      {selectedPayment && (
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
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              {selectedPayment.action === 'resolve' ? '✅ Resolve Payment' : '❌ Cancel Payment'}
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>
              {selectedPayment.restaurant_name} - {formatCurrency(selectedPayment.amount)}
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 8 }}>Resolution Notes</label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter notes..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  minHeight: 100,
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  if (selectedPayment.action === 'resolve') {
                    resolveMutation.mutate({ id: selectedPayment.id, notes: resolutionNotes });
                  } else {
                    cancelMutation.mutate({ id: selectedPayment.id, notes: resolutionNotes });
                  }
                }}
                disabled={resolveMutation.isPending || cancelMutation.isPending}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: selectedPayment.action === 'resolve' ? '#16A34A' : '#dc2626',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {selectedPayment.action === 'resolve' ? 'Confirm Resolve' : 'Confirm Cancel & Downgrade'}
              </button>
              <button
                onClick={() => {
                  setSelectedPayment(null);
                  setResolutionNotes('');
                }}
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
