import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuApi } from '../../api/queries.js';

const EMPTY = { name: '', category: '', description: '', price: '', tags: '', allergens: '', is_available: true };

export default function MenuManager() {
  const { slug } = useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

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
    setForm({ ...item, tags: item.tags?.join(', ') || '', allergens: item.allergens?.join(', ') || '' });
    setShowForm(true);
  };

  const parseForm = () => ({
    ...form, price: parseFloat(form.price),
    tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    allergens: form.allergens ? form.allergens.split(',').map(t => t.trim()).filter(Boolean) : [],
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

const S = { input: { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' } };
