import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { menuApi, restaurantApi } from '../../api/queries.js';
import { useCartStore } from '../../store/cartStore.js';

const C = { bg:'#0C0A07', card:'#161310', gold:'#C8A84B', cream:'#F2E8D0', muted:'#A89880', border:'#2A2520' };
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Crimson+Text:wght@400;600&display=swap');`;
const TAG_COLORS = { vegan:'100,200,120', vegetarian:'120,200,100', 'gluten-free':'200,180,100', spicy:'220,80,60', 'nut-free':'100,160,220' };

export default function CustomerMenu() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableNumber = searchParams.get('table') || '';
  const [category, setCategory] = useState('All');
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [addedId, setAddedId] = useState(null);
  const addItem = useCartStore(s => s.addItem);
  const items = useCartStore(s => s.items);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);

  const { data: restaurant } = useQuery({ queryKey: ['restaurant', slug], queryFn: () => restaurantApi.get(slug) });
  const { data: menu = [], isLoading } = useQuery({ queryKey: ['menu', slug], queryFn: () => menuApi.getPublic(slug) });

  const categories = ['All', ...new Set(menu.map(i => i.category))];
  const filters = ['vegan', 'vegetarian', 'gluten-free', 'spicy', 'nut-free'];

  const filtered = menu.filter(item => {
    if (category !== 'All' && item.category !== category) return false;
    for (const f of activeFilters) if (!item.tags?.includes(f)) return false;
    return true;
  });

  const toggleFilter = (f) => setActiveFilters(p => { const n = new Set(p); n.has(f) ? n.delete(f) : n.add(f); return n; });

  const handleAdd = (item) => {
    addItem(item, slug);
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  if (isLoading) return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, fontSize: 18 }}>Loading menu…</div>;

  return (
    <>
      <style>{FONTS}</style>
      <div style={{ fontFamily: "'Crimson Text', serif", background: C.bg, minHeight: '100vh', color: C.cream }}>

        {/* Header */}
        <div style={{ textAlign: 'center', padding: '40px 20px 30px', borderBottom: `1px solid ${C.border}` }}>
          {restaurant?.logo_url && <img src={restaurant.logo_url} alt="logo" style={{ width: 60, height: 60, borderRadius: '50%', marginBottom: 12 }} />}
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: C.gold }}>{restaurant?.name}</div>
          {tableNumber && <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>Table {tableNumber}</div>}
        </div>

        {/* Filters */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ padding: '6px 18px', border: `1px solid ${category === cat ? C.gold : C.border}`, background: category === cat ? C.gold : 'transparent', color: category === cat ? C.bg : C.muted, borderRadius: 2, fontFamily: "'Playfair Display', serif", fontSize: 13, cursor: 'pointer' }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {filters.map(f => (
              <button key={f} onClick={() => toggleFilter(f)}
                style={{ padding: '4px 12px', border: `1px solid ${activeFilters.has(f) ? C.gold : C.border}`, background: activeFilters.has(f) ? 'rgba(200,168,75,0.1)' : 'transparent', color: activeFilters.has(f) ? C.gold : C.muted, borderRadius: 20, fontSize: 12, cursor: 'pointer' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Menu grid */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
          {filtered.map(item => (
            <div key={item.id}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ position: 'relative', textAlign: 'center', padding: '18px 0 8px', background: 'rgba(200,168,75,0.04)', minHeight: 100 }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <span style={{ fontSize: 44 }}>🍽</span>
                )}
                {item.video_url && (
                  <button 
                    onClick={() => window.open(item.video_url, '_blank')}
                    style={{ position: 'absolute', bottom: 8, right: 8, background: '#C8A84B', color: '#0C0A07', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Watch video"
                  >
                    ▶
                  </button>
                )}
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: C.cream, margin: '6px 0' }}>{item.name}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 8 }}>{item.description}</div>
                {item.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {item.tags.map(t => <span key={t} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 20, background: `rgba(${TAG_COLORS[t]||'180,180,180'},0.12)`, color: `rgb(${TAG_COLORS[t]||'180,180,180'})`, border: `1px solid rgba(${TAG_COLORS[t]||'180,180,180'},0.25)` }}>{t}</span>)}
                  </div>
                )}
                {item.allergens?.length > 0 && <div style={{ fontSize: 12, color: '#e07070', marginBottom: 8 }}>⚠️ Contains: {item.allergens.join(', ')}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: C.gold }}>₹{parseFloat(item.price).toFixed(2)}</span>
                  <button onClick={() => handleAdd(item)}
                    style={{ background: addedId === item.id ? '#27AE60' : C.gold, color: C.bg, border: 'none', padding: '7px 16px', borderRadius: 2, fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}>
                    {addedId === item.id ? '✓' : '+ Add'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart bar */}
        {count > 0 && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.gold, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: C.bg, fontWeight: 700 }}>{count} item{count > 1 ? 's' : ''}</span>
            <button onClick={() => navigate(`/r/${slug}/checkout`, { state: { tableNumber } })}
              style={{ background: C.bg, color: C.gold, border: 'none', padding: '8px 20px', borderRadius: 4, fontWeight: 700, fontSize: 15 }}>
              View Cart — ₹{total.toFixed(2)} →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
