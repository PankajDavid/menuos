import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };

export default function PlanLimits() {
  const qc = useQueryClient();
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plan-limits'],
    queryFn: platformApi.getPlanLimits,
  });

  const updateMutation = useMutation({
    mutationFn: ({ plan, data }) => platformApi.updatePlanLimits(plan, data),
    onSuccess: () => {
      qc.invalidateQueries(['plan-limits']);
      setEditingPlan(null);
    },
  });

  const handleEdit = (plan) => {
    setEditingPlan(plan.plan);
    setFormData({ ...plan });
  };

  const handleSave = () => {
    const { plan, id, updated_at, ...data } = formData;
    updateMutation.mutate({ plan: editingPlan, data });
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1400 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Plan Limits Configuration</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Configure limits and pricing for each subscription plan</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {plans.map((plan) => (
          <div key={plan.plan} style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ 
              padding: '20px 24px', 
              background: PLAN_COLORS[plan.plan],
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{plan.plan}</h2>
              <button
                onClick={() => handleEdit(plan)}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {editingPlan === plan.plan ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={formData.monthly_price || 0}
                      onChange={(e) => handleChange('monthly_price', parseFloat(e.target.value))}
                      style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Yearly Price (₹)</label>
                    <input
                      type="number"
                      value={formData.yearly_price || 0}
                      onChange={(e) => handleChange('yearly_price', parseFloat(e.target.value))}
                      style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Max Menu Items</label>
                    <input
                      type="number"
                      value={formData.max_menu_items || 0}
                      onChange={(e) => handleChange('max_menu_items', parseInt(e.target.value))}
                      style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Max Tables</label>
                    <input
                      type="number"
                      value={formData.max_tables || 0}
                      onChange={(e) => handleChange('max_tables', parseInt(e.target.value))}
                      style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Max Staff Users</label>
                    <input
                      type="number"
                      value={formData.max_staff_users || 0}
                      onChange={(e) => handleChange('max_staff_users', parseInt(e.target.value))}
                      style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Max Photos/Month</label>
                    <input
                      type="number"
                      value={formData.max_photos_per_month || 0}
                      onChange={(e) => handleChange('max_photos_per_month', parseInt(e.target.value))}
                      style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: '#16A34A',
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingPlan(null)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: '#334155',
                        border: 'none',
                        borderRadius: 6,
                        color: '#e2e8f0',
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8' }}>Monthly Price</span>
                    <span style={{ fontWeight: 600, color: '#C8A84B' }}>₹{plan.monthly_price}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8' }}>Yearly Price</span>
                    <span style={{ fontWeight: 600, color: '#C8A84B' }}>₹{plan.yearly_price}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8' }}>Max Menu Items</span>
                    <span style={{ fontWeight: 600 }}>{plan.max_menu_items === 999999 ? 'Unlimited' : plan.max_menu_items}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8' }}>Max Tables</span>
                    <span style={{ fontWeight: 600 }}>{plan.max_tables === 999999 ? 'Unlimited' : plan.max_tables}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8' }}>Max Staff</span>
                    <span style={{ fontWeight: 600 }}>{plan.max_staff_users === 999999 ? 'Unlimited' : plan.max_staff_users}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8' }}>Photos/Month</span>
                    <span style={{ fontWeight: 600 }}>{plan.max_photos_per_month === 999999 ? 'Unlimited' : plan.max_photos_per_month}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8' }}>Videos/Month</span>
                    <span style={{ fontWeight: 600 }}>{plan.max_videos_per_month === 999999 ? 'Unlimited' : plan.max_videos_per_month}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8' }}>Custom Domain</span>
                    <span style={{ fontWeight: 600 }}>{plan.allows_custom_domain ? '✓' : '✗'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8' }}>White Label</span>
                    <span style={{ fontWeight: 600 }}>{plan.allows_white_label ? '✓' : '✗'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: '#94a3b8' }}>Support Level</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{plan.support_level}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
