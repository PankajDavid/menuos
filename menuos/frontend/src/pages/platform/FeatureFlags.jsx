import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };

export default function FeatureFlags() {
  const qc = useQueryClient();
  const [editingFeature, setEditingFeature] = useState(null);
  const [formData, setFormData] = useState({});

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: platformApi.getFeatureFlags,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }) => platformApi.updateFeatureFlag(key, data),
    onSuccess: () => {
      qc.invalidateQueries(['feature-flags']);
      setEditingFeature(null);
    },
  });

  const handleToggle = (feature) => {
    updateMutation.mutate({
      key: feature.key,
      data: { is_enabled: !feature.is_enabled }
    });
  };

  const handleEdit = (feature) => {
    setEditingFeature(feature.key);
    setFormData({
      allowed_plans: feature.allowed_plans || []
    });
  };

  const handleSave = () => {
    updateMutation.mutate({
      key: editingFeature,
      data: { allowed_plans: formData.allowed_plans }
    });
  };

  const togglePlan = (plan) => {
    const currentPlans = formData.allowed_plans || [];
    if (currentPlans.includes(plan)) {
      setFormData({
        ...formData,
        allowed_plans: currentPlans.filter(p => p !== plan)
      });
    } else {
      setFormData({
        ...formData,
        allowed_plans: [...currentPlans, plan]
      });
    }
  };

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>🚦 Feature Flags</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Enable or disable features globally and configure plan access</p>

      <div style={{ display: 'grid', gap: 16 }}>
        {features.map((feature) => (
          <div 
            key={feature.key} 
            style={{ 
              background: '#1e293b', 
              borderRadius: 12, 
              padding: 24,
              border: feature.is_enabled ? '2px solid #16A34A' : '2px solid transparent'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{feature.name}</h3>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>{feature.description}</p>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ 
                  padding: '4px 12px', 
                  borderRadius: 12, 
                  fontSize: 12, 
                  fontWeight: 600,
                  background: feature.is_enabled ? '#dcfce7' : '#fee2e2',
                  color: feature.is_enabled ? '#16A34A' : '#dc2626'
                }}>
                  {feature.is_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={() => handleToggle(feature)}
                  disabled={updateMutation.isPending}
                  style={{
                    padding: '8px 16px',
                    background: feature.is_enabled ? '#dc2626' : '#16A34A',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  {feature.is_enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>

            {editingFeature === feature.key ? (
              <div style={{ background: '#0f172a', padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>Available for Plans:</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {['free', 'basic', 'pro', 'premium'].map(plan => (
                      <label key={plan} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={(formData.allowed_plans || []).includes(plan)}
                          onChange={() => togglePlan(plan)}
                        />
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
                      </label>
                    ))}
                  </div>
                  <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                    Leave all unchecked to make available for all plans
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    style={{
                      padding: '8px 16px',
                      background: '#16A34A',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingFeature(null)}
                    style={{
                      padding: '8px 16px',
                      background: '#334155',
                      border: 'none',
                      borderRadius: 6,
                      color: '#e2e8f0',
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 12, color: '#64748b', marginRight: 8 }}>Available for:</span>
                  {feature.allowed_plans ? (
                    <div style={{ display: 'inline-flex', gap: 6, marginTop: 4 }}>
                      {feature.allowed_plans.map(plan => (
                        <span key={plan} style={{ 
                          padding: '2px 8px', 
                          borderRadius: 12, 
                          fontSize: 11, 
                          background: PLAN_COLORS[plan],
                          color: '#fff',
                          textTransform: 'capitalize'
                        }}>
                          {plan}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#16A34A', fontSize: 13 }}>All plans</span>
                  )}
                </div>
                <button
                  onClick={() => handleEdit(feature)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#94a3b8',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Edit Plans
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
