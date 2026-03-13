import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantApi } from '../../api/queries.js';

export default function RestaurantSettings() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    gst_number: '',
    logo_url: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant', slug],
    queryFn: () => restaurantApi.get(slug)
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        phone: restaurant.phone || '',
        address: restaurant.address || '',
        gst_number: restaurant.gst_number || '',
        logo_url: restaurant.logo_url || ''
      });
    }
  }, [restaurant]);

  const updateMutation = useMutation({
    mutationFn: (data) => restaurantApi.update(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant', slug]);
      alert('Settings saved successfully!');
    },
    onError: (err) => {
      alert('Error saving settings: ' + err.message);
    }
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'menuos');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      const data = await response.json();
      setFormData(prev => ({ ...prev, logo_url: data.secure_url }));
    } catch (err) {
      alert('Error uploading logo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Restaurant Settings</h1>
      <p style={{ color: '#64748b', marginBottom: 28 }}>Manage your restaurant profile and business information</p>

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {/* Logo Upload */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Restaurant Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {formData.logo_url ? (
              <img src={formData.logo_url} alt="Logo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <div style={{ width: 80, height: 80, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No Logo</div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                style={{ display: 'none' }}
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: uploading ? '#9ca3af' : '#C8A84B',
                  color: '#fff',
                  borderRadius: 6,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </label>
            </div>
          </div>
        </div>

        {/* Restaurant Name */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Restaurant Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
          />
        </div>

        {/* GST Number */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>GST Number</label>
          <input
            type="text"
            name="gst_number"
            value={formData.gst_number}
            onChange={handleChange}
            placeholder="e.g., 27AABCU9603R1ZX"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
          />
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Required for tax invoices (Indian businesses)</p>
        </div>

        {/* Phone */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g., +91 98765 43210"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
          />
        </div>

        {/* Address */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={3}
            placeholder="Full restaurant address"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, resize: 'vertical' }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={updateMutation.isPending}
          style={{
            padding: '12px 24px',
            background: updateMutation.isPending ? '#9ca3af' : '#C8A84B',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: updateMutation.isPending ? 'not-allowed' : 'pointer'
          }}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
