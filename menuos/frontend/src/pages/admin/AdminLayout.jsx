import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

const NAV = [
  { to: '', label: '📊 Dashboard', end: true },
  { to: 'menu', label: '🍽 Menu' },
  { to: 'orders', label: '📋 Orders' },
  { to: 'tables', label: '🪑 Tables & QR' },
  { to: 'staff', label: '👥 Staff' },
  { to: 'settings', label: '⚙️ Settings' },
];

export default function AdminLayout() {
  const { slug } = useParams();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const S = {
    layout: { display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
    sidebar: { width: 240, background: '#1A1A2E', display: 'flex', flexDirection: 'column', flexShrink: 0 },
    brand: { padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
    brandName: { fontFamily: 'Playfair Display, serif', color: '#C8A84B', fontSize: 20 },
    restaurantName: { color: '#94a3b8', fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
    footer: { padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' },
    content: { flex: 1, background: '#f8fafc', overflow: 'auto' },
    kitchenBtn: { display: 'block', padding: '8px 12px', color: '#94a3b8', fontSize: 14, textDecoration: 'none', borderRadius: 8, marginBottom: 4 },
    logoutBtn: { width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 14, textAlign: 'left', borderRadius: 8, cursor: 'pointer' },
  };

  return (
    <div style={S.layout}>
      <aside style={S.sidebar}>
        <div style={S.brand}>
          <div style={S.brandName}>🍽 MenuOS</div>
          <div style={S.restaurantName}>{user?.restaurant_name || slug}</div>
        </div>
        <nav style={S.nav}>
          {NAV.map(item => (
            <NavLink key={item.to} to={`/r/${slug}/admin${item.to ? '/' + item.to : ''}`} end={item.end}
              style={({ isActive }) => ({
                display: 'block', padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
                fontSize: 14, fontWeight: 500,
                background: isActive ? 'rgba(200,168,75,0.12)' : 'transparent',
                color: isActive ? '#C8A84B' : '#94a3b8',
              })}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={S.footer}>
          <a href={`/r/${slug}/kitchen`} style={S.kitchenBtn}>👨‍🍳 Kitchen View</a>
          <a href={`/r/${slug}/menu`} target="_blank" rel="noreferrer" style={S.kitchenBtn}>🔗 View Menu</a>
          {user?.role === 'platform_admin' && (
            <a href="/platform" style={{...S.kitchenBtn, color: '#C8A84B', fontWeight: 600}}>⚡ Platform Admin</a>
          )}
          <button onClick={handleLogout} style={S.logoutBtn}>🚪 Logout</button>
        </div>
      </aside>
      <main style={S.content}><Outlet /></main>
    </div>
  );
}
