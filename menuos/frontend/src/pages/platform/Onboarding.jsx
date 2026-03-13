import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const CATEGORY_COLORS = {
  setup: '#2563EB',
  menu: '#16A34A',
  staff: '#C8A84B',
  launch: '#dc2626'
};

export default function Onboarding() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    key: '',
    title: '',
    description: '',
    category: 'setup',
    order_index: 0,
    is_required: true
  });

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['onboarding-overview'],
    queryFn: platformApi.getOnboardingOverview,
    enabled: activeTab === 'overview',
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['onboarding-items'],
    queryFn: platformApi.getOnboardingItems,
    enabled: activeTab === 'items',
  });

  const createMutation = useMutation({
    mutationFn: platformApi.createOnboardingItem,
    onSuccess: () => {
      qc.invalidateQueries(['onboarding-items']);
      setIsCreating(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => platformApi.updateOnboardingItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['onboarding-items']);
      setEditingItem(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: platformApi.deleteOnboardingItem,
    onSuccess: () => qc.invalidateQueries(['onboarding-items']),
  });

  const resetForm = () => {
    setFormData({
      key: '',
      title: '',
      description: '',
      category: 'setup',
      order_index: 0,
      is_required: true
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setFormData({
      key: item.key,
      title: item.title,
      description: item.description || '',
      category: item.category,
      order_index: item.order_index,
      is_required: item.is_required
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleRequired = (item) => {
    updateMutation.mutate({
      id: item.id,
      data: { is_required: !item.is_required }
    });
  };

  const handleToggleActive = (item) => {
    updateMutation.mutate({
      id: item.id,
      data: { is_active: !item.is_active }
    });
  };

  if (activeTab === 'overview' && overviewLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;
  if (activeTab === 'items' && itemsLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>✅ Onboarding Checklist</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Guide new restaurants through setup</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {['overview', 'items'].map(tab => (
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

      {activeTab === 'overview' && overview && (
        <div>
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#C8A84B' }}>{overview.summary.total_restaurants}</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Total Restaurants</div>
            </div>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#16A34A' }}>{overview.summary.fully_onboarded}</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Fully Onboarded</div>
            </div>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>{overview.summary.partially_onboarded}</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>In Progress</div>
            </div>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#dc2626' }}>{overview.summary.not_started}</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Not Started</div>
            </div>
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#C8A84B' }}>{overview.summary.average_completion}%</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Avg Completion</div>
            </div>
          </div>

          {/* Restaurant Progress List */}
          <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Restaurant Progress</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Restaurant', 'Plan', 'Progress', 'Required', 'Status'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overview.restaurants.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{r.slug}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          padding: '3px 10px', 
                          borderRadius: 12, 
                          fontSize: 11, 
                          fontWeight: 600,
                          background: r.subscription_plan === 'premium' ? '#7C3AED' : r.subscription_plan === 'pro' ? '#C8A84B' : r.subscription_plan === 'basic' ? '#2563EB' : '#64748b',
                          color: '#fff',
                          textTransform: 'capitalize'
                        }}>
                          {r.subscription_plan}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1, height: 8, background: '#334155', borderRadius: 4, overflow: 'hidden', maxWidth: 150 }}>
                            <div style={{
                              height: '100%',
                              width: `${r.completion_percentage}%`,
                              background: r.completion_percentage === 100 ? '#16A34A' : r.completion_percentage > 50 ? '#3b82f6' : '#C8A84B',
                              borderRadius: 4
                            }} />
                          </div>
                          <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600, minWidth: 40 }}>{r.completion_percentage}%</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                          {r.completed_items} / {r.total_items} items
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, color: '#e2e8f0' }}>
                          {r.required_completed} / {r.required_items} required
                        </div>
                        <div style={{ fontSize: 11, color: r.required_completion_percentage === 100 ? '#16A34A' : '#64748b' }}>
                          {r.required_completion_percentage}% complete
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {r.completion_percentage === 100 ? (
                          <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, background: '#dcfce7', color: '#16A34A', fontWeight: 600 }}>✓ Complete</span>
                        ) : r.completion_percentage > 0 ? (
                          <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, background: '#dbeafe', color: '#3b82f6', fontWeight: 600 }}>In Progress</span>
                        ) : (
                          <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, background: '#fee2e2', color: '#dc2626', fontWeight: 600 }}>Not Started</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Checklist Items ({items.length})</h2>
            <button
              onClick={() => setIsCreating(true)}
              style={{
                padding: '10px 20px',
                background: '#16A34A',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Add Item
            </button>
          </div>

          {/* Create/Edit Form */}
          {(isCreating || editingItem) && (
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
                {editingItem ? 'Edit Item' : 'Create Item'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Key (unique identifier)</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingItem}
                      value={formData.key}
                      onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        color: '#e2e8f0',
                        fontSize: 14
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        color: '#e2e8f0',
                        fontSize: 14
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#e2e8f0',
                      fontSize: 14
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        color: '#e2e8f0',
                        fontSize: 14
                      }}
                    >
                      <option value="setup">Setup</option>
                      <option value="menu">Menu</option>
                      <option value="staff">Staff</option>
                      <option value="launch">Launch</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Order</label>
                    <input
                      type="number"
                      value={formData.order_index}
                      onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        color: '#e2e8f0',
                        fontSize: 14
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.is_required}
                        onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                      />
                      <span style={{ color: '#e2e8f0' }}>Required item</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    style={{
                      padding: '10px 24px',
                      background: '#16A34A',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {editingItem ? 'Update' : 'Create'} Item
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    style={{
                      padding: '10px 24px',
                      background: 'transparent',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#94a3b8',
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Items List */}
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map((item) => (
              <div 
                key={item.id} 
                style={{ 
                  background: '#1e293b', 
                  borderRadius: 12, 
                  padding: 20,
                  borderLeft: `4px solid ${CATEGORY_COLORS[item.category] || '#64748b'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#64748b', minWidth: 30 }}>
                      {item.order_index}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>{item.title}</h3>
                        {item.is_required && (
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, background: '#dc2626', color: '#fff' }}>Required</span>
                        )}
                        <span style={{ 
                          padding: '3px 10px', 
                          borderRadius: 12, 
                          fontSize: 11, 
                          background: CATEGORY_COLORS[item.category] + '20',
                          color: CATEGORY_COLORS[item.category],
                          textTransform: 'capitalize'
                        }}>
                          {item.category}
                        </span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: 13 }}>{item.description}</p>
                      <code style={{ fontSize: 11, color: '#475569' }}>{item.key}</code>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleEdit(item)}
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
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleRequired(item)}
                      style={{
                        padding: '6px 12px',
                        background: item.is_required ? '#dc262620' : '#16A34A20',
                        border: 'none',
                        borderRadius: 6,
                        color: item.is_required ? '#dc2626' : '#16A34A',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {item.is_required ? 'Make Optional' : 'Make Required'}
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid #dc2626',
                        borderRadius: 6,
                        color: '#dc2626',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
