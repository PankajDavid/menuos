import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuApi } from '../../api/queries.js';

const EMPTY = { name: '', category: '', description: '', price: '', tags: '', allergens: '', image_url: '', video_url: '', is_available: true };

// Cloudinary configuration - Set these in Railway environment variables
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'menuos_uploads';

async function uploadToCloudinary(file, type = 'image') {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary not configured. Please set VITE_CLOUDINARY_CLOUD_NAME environment variable.');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  
  const resourceType = type === 'video' ? 'video' : 'image';
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload failed');
  }
  
  const data = await response.json();
  return data.secure_url;
}

export default function MenuManager() {
  const { slug } = useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState({ image: false, video: false });

  const { data: items = [], isLoading } = useQuery({ queryKey: ['menu-all', slug], queryFn: () => menuApi.getAll(slug) });

  const invalidate = () => { qc.invalidateQueries(['menu-all', slug]); qc.invalidateQueries(['menu', slug]); };

  const createMutation = useMutation({
    mutationFn: (data) => menuApi.create(slug, data),
    onSuccess: () => { invalidate(); setShowForm(false); setForm(EMPTY); },
    onError: (err) => { alert('Error creating item: ' + (err.response?.data?.error || err.message)); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => menuApi.update(slug, id, data),
    onSuccess: () => { invalidate(); setEditing(null); setShowForm(false); setForm(EMPTY); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => menuApi.delete(slug, id),
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => menuApi.toggle(slug, id),
    onSuccess: invalidate,
  });

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({ 
      ...item, 
      tags: item.tags?.join(', ') || '', 
      allergens: item.allergens?.join(', ') || '',
      image_url: item.image_url || '',
      video_url: item.video_url || ''
    });
    setShowForm(true);
  };

  const parseForm = () => ({
    ...form, price: parseFloat(form.price),
    tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    allergens: form.allergens ? form.allergens.split(',').map(t => t.trim()).filter(Boolean) : [],
    image_url: form.image_url || null,
    video_url: form.video_url || null,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted', form);
    const data = parseForm();
    console.log('Parsed data', data);
    if (editing) updateMutation.mutate({ id: editing, data });
    else createMutation.mutate(data);
  };

  const categories = [...new Set(items.map(i => i.category))];

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (10MB max for videos, 5MB for images)
    const maxSize = type === 'video' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Max size: ${type === 'video' ? '10MB' : '5MB'}`);
      return;
    }
    
    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      const url = await uploadToCloudinary(file, type);
      setForm(prev => ({ ...prev, [`${type}_url`]: url }));
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Menu Items</h1>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}
          style={{ background: '#C8A84B', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
          + Add Item
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>{editing ? 'Edit Item' : 'New Item'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['name','Name *'], ['category','Category *'], ['price','Price *'], ['description','Description']].map(([k, label]) => (
              <div key={k} style={{ gridColumn: k === 'description' ? '1/-1' : 'auto' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                {k === 'description'
                  ? <textarea style={S.input} value={form[k] || ''} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} rows={2} />
                  : <input style={S.input} required={['name','category','price'].includes(k)} type={k==='price'?'number':'text'} step={k==='price'?'0.01':undefined} value={form[k] || ''} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
                }
              </div>
            ))}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Tags (comma-separated)</label>
              <input style={S.input} value={form.tags || ''} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="vegan, spicy, gluten-free" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Allergens (comma-separated)</label>
              <input style={S.input} value={form.allergens || ''} onChange={e => setForm(p => ({ ...p, allergens: e.target.value }))} placeholder="dairy, nuts, gluten" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Photo</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <input style={{ ...S.input, flex: 1 }} value={form.image_url || ''} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://... or upload below" />
                <label style={{ ...S.uploadBtn, opacity: uploading.image ? 0.6 : 1 }}>
                  {uploading.image ? 'Uploading...' : '📁 Upload'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'image')} disabled={uploading.image} />
                </label>
              </div>
              {form.image_url && <img src={form.image_url} alt="Preview" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} onError={e => e.target.style.display = 'none'} />}
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Video (10 sec max)</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <input style={{ ...S.input, flex: 1 }} value={form.video_url || ''} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} placeholder="https://... or upload below" />
                <label style={{ ...S.uploadBtn, opacity: uploading.video ? 0.6 : 1 }}>
                  {uploading.video ? 'Uploading...' : '🎥 Upload'}
                  <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'video')} disabled={uploading.video} />
                </label>
              </div>
              {form.video_url && (
                <video src={form.video_url} style={{ width: 200, height: 150, borderRadius: 8, marginTop: 8 }} controls muted loop onError={e => e.target.style.display = 'none'} />
              )}
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                style={{ background: (createMutation.isPending || updateMutation.isPending) ? '#ccc' : '#C8A84B', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, cursor: (createMutation.isPending || updateMutation.isPending) ? 'not-allowed' : 'pointer' }}>
                {createMutation.isPending ? 'Creating...' : updateMutation.isPending ? 'Updating...' : editing ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}
                style={{ background: '#f1f5f9', color: '#374151', border: 'none', padding: '10px 20px', borderRadius: 8 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? <div>Loading…</div> : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Name', 'Category', 'Price', 'Tags', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 14 }}>{item.category}</td>
                  <td style={{ padding: '12px 16px', color: '#C8A84B', fontWeight: 600 }}>₹{parseFloat(item.price).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {item.tags?.map(t => <span key={t} style={{ background: '#f0fdf4', color: '#16A34A', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>{t}</span>)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggleMutation.mutate(item.id)}
                      style={{ padding: '4px 12px', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, background: item.is_available ? '#dcfce7' : '#fee2e2', color: item.is_available ? '#16A34A' : '#dc2626', cursor: 'pointer' }}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(item)} style={{ background: '#eff6ff', color: '#2563EB', border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => confirm('Delete?') && deleteMutation.mutate(item.id)}
                        style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No menu items yet. Add your first item!</div>}
        </div>
      )}
    </div>
  );
}

const S = { 
  input: { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  uploadBtn: { 
    background: '#f1f5f9', 
    color: '#374151', 
    border: '1px solid #e2e8f0', 
    padding: '8px 16px', 
    borderRadius: 8, 
    fontSize: 14, 
    cursor: 'pointer',
    fontWeight: 500,
    whiteSpace: 'nowrap'
  }
};
