import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios.js';

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'staff', label: 'Staff', description: 'Can manage orders and view menu' },
  { value: 'kitchen', label: 'Kitchen', description: 'Access to kitchen dashboard only' }
];

export default function StaffManagement() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', slug],
    queryFn: async () => {
      const response = await api.get(`/api/restaurants/${slug}/staff`);
      return response.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/api/restaurants/${slug}/staff`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff', slug]);
      setFormData({ name: '', email: '', password: '', role: 'staff' });
      setShowForm(false);
      alert('Staff member added successfully!');
    },
    onError: (err) => {
      alert('Error adding staff: ' + (err.response?.data?.error || err.message));
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await api.patch(`/api/restaurants/${slug}/staff/${userId}/toggle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff', slug]);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (isLoading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Staff Management</h1>
          <p style={{ color: '#64748b' }}>Manage your restaurant staff and their access levels</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            background: '#C8A84B',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {showForm ? 'Cancel' : '+ Add Staff'}
        </button>
      </div>

      {/* Add Staff Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>Add New Staff Member</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: '#f3f4f6', borderRadius: 6 }}>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              <strong>{ROLES.find(r => r.value === formData.role)?.label}:</strong> {ROLES.find(r => r.value === formData.role)?.description}
            </p>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            style={{
              marginTop: 20,
              padding: '12px 24px',
              background: createMutation.isPending ? '#9ca3af' : '#C8A84B',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: createMutation.isPending ? 'not-allowed' : 'pointer'
            }}
          >
            {createMutation.isPending ? 'Adding...' : 'Add Staff Member'}
          </button>
        </form>
      )}

      {/* Staff List */}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>Email</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>Role</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>Last Login</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#1e293b' }}>{member.name}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{member.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    background: member.role === 'admin' ? '#dbeafe' : member.role === 'kitchen' ? '#fef3c7' : '#f3f4f6',
                    color: member.role === 'admin' ? '#1e40af' : member.role === 'kitchen' ? '#92400e' : '#374151'
                  }}>
                    {ROLES.find(r => r.value === member.role)?.label || member.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    background: member.is_active ? '#d1fae5' : '#fee2e2',
                    color: member.is_active ? '#065f46' : '#991b1b'
                  }}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                  {member.last_login_at ? new Date(member.last_login_at).toLocaleDateString() : 'Never'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    onClick={() => toggleMutation.mutate(member.id)}
                    disabled={toggleMutation.isPending}
                    style={{
                      padding: '6px 12px',
                      background: member.is_active ? '#fee2e2' : '#d1fae5',
                      color: member.is_active ? '#991b1b' : '#065f46',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    {member.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                  No staff members found. Click "Add Staff" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Role Descriptions */}
      <div style={{ marginTop: 24, padding: 20, background: '#f8fafc', borderRadius: 8 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Role Permissions</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {ROLES.map(role => (
            <div key={role.value} style={{ padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{role.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{role.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
