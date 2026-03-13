import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const TYPE_COLORS = {
  info: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  success: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  warning: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  error: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' }
};

const TARGET_LABELS = {
  all: 'Everyone',
  restaurants: 'Restaurant Users',
  customers: 'Customers',
  platform_admins: 'Platform Admins'
};

export default function Announcements() {
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    target_audience: 'all',
    starts_at: '',
    expires_at: ''
  });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: platformApi.getAnnouncements,
  });

  const createMutation = useMutation({
    mutationFn: platformApi.createAnnouncement,
    onSuccess: () => {
      qc.invalidateQueries(['announcements']);
      setIsCreating(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => platformApi.updateAnnouncement(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['announcements']);
      setEditingId(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: platformApi.deleteAnnouncement,
    onSuccess: () => qc.invalidateQueries(['announcements']),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      target_audience: 'all',
      starts_at: '',
      expires_at: ''
    });
  };

  const handleEdit = (announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      target_audience: announcement.target_audience,
      starts_at: announcement.starts_at ? new Date(announcement.starts_at).toISOString().slice(0, 16) : '',
      expires_at: announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      starts_at: formData.starts_at || null,
      expires_at: formData.expires_at || null
    };
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggle = (announcement) => {
    updateMutation.mutate({
      id: announcement.id,
      data: { is_active: !announcement.is_active }
    });
  };

  const isExpired = (announcement) => {
    return announcement.expires_at && new Date(announcement.expires_at) < new Date();
  };

  const isScheduled = (announcement) => {
    return announcement.starts_at && new Date(announcement.starts_at) > new Date();
  };

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>📢 Announcements</h1>
          <p style={{ color: '#64748b' }}>Manage platform-wide notifications for users</p>
        </div>
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
          + New Announcement
        </button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
            {editingId ? 'Edit Announcement' : 'Create Announcement'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Title *</label>
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

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Content *</label>
              <textarea
                required
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
                  <option value="info">ℹ️ Info</option>
                  <option value="success">✅ Success</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="error">❌ Error</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Target Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
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
                  <option value="all">Everyone</option>
                  <option value="restaurants">Restaurant Users</option>
                  <option value="customers">Customers</option>
                  <option value="platform_admins">Platform Admins</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Start Date (optional)</label>
                <input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
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
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Expiry Date (optional)</label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
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
                {editingId ? 'Update' : 'Create'} Announcement
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingId(null);
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

      {/* Announcements List */}
      <div style={{ display: 'grid', gap: 16 }}>
        {announcements.map((announcement) => {
          const colors = TYPE_COLORS[announcement.type];
          const expired = isExpired(announcement);
          const scheduled = isScheduled(announcement);
          
          return (
            <div 
              key={announcement.id} 
              style={{ 
                background: '#1e293b', 
                borderRadius: 12, 
                padding: 24,
                borderLeft: `4px solid ${colors.border}`,
                opacity: announcement.is_active ? 1 : 0.6
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{announcement.title}</h3>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    background: colors.bg,
                    color: colors.text,
                    textTransform: 'uppercase'
                  }}>
                    {announcement.type}
                  </span>
                  {expired && (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      background: '#fee2e2',
                      color: '#991b1b'
                    }}>
                      Expired
                    </span>
                  )}
                  {scheduled && (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      background: '#dbeafe',
                      color: '#1e40af'
                    }}>
                      Scheduled
                    </span>
                  )}
                  {!announcement.is_active && (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      background: '#334155',
                      color: '#94a3b8'
                    }}>
                      Disabled
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleEdit(announcement)}
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
                    onClick={() => handleToggle(announcement)}
                    style={{
                      padding: '6px 12px',
                      background: announcement.is_active ? '#dc2626' : '#16A34A',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    {announcement.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(announcement.id)}
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

              <p style={{ color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>{announcement.content}</p>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12, color: '#64748b' }}>
                <span>👥 {TARGET_LABELS[announcement.target_audience]}</span>
                <span>👤 By {announcement.created_by_name || 'Unknown'}</span>
                <span>📅 Created {new Date(announcement.created_at).toLocaleDateString()}</span>
                {announcement.starts_at && (
                  <span>▶️ Starts {new Date(announcement.starts_at).toLocaleString()}</span>
                )}
                {announcement.expires_at && (
                  <span>⏹️ Expires {new Date(announcement.expires_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
