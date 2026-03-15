import { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

const NAV = [
  { to: '', label: 'Dashboard', icon: '📊', end: true },
  { to: 'menu', label: 'Menu', icon: '🍽' },
  { to: 'orders', label: 'Orders', icon: '📋' },
  { to: 'tables', label: 'Tables & QR', icon: '🪑' },
  { to: 'staff', label: 'Staff', icon: '👥' },
  { to: 'settings', label: 'Settings', icon: '⚙️' },
  { to: 'subscription', label: 'Subscription', icon: '📋' },
  { to: 'invoices', label: 'Invoices', icon: '🧾' },
  { to: 'reports', label: 'Reports', icon: '📈' },
];

export default function AdminLayout() {
  const { slug } = useParams();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const sidebarStyle = {
    width: 240,
    background: '#1A1A2E',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    height: '100vh',
    position: isMobile ? 'fixed' : 'sticky',
    top: 0,
    left: isMobile ? (sidebarOpen ? 0 : -240) : 0,
    zIndex: 1000,
    transition: 'left 0.3s ease',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: '#1A1A2E',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          zIndex: 998,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#C8A84B',
              fontSize: 24,
              cursor: 'pointer',
              padding: 8,
              marginRight: 12,
            }}
          >
            ☰
          </button>
          <span style={{ fontFamily: 'Playfair Display, serif', color: '#C8A84B', fontSize: 18 }}>
            🍽 MenuOS
          </span>
        </div>
      )}

      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', color: '#C8A84B', fontSize: 20 }}>🍽 MenuOS</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.restaurant_name || slug}
          </div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={`/r/${slug}/admin${item.to ? '/' + item.to : ''}`}
              end={item.end}
              onClick={() => isMobile && setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                background: isActive ? 'rgba(200,168,75,0.12)' : 'transparent',
                color: isActive ? '#C8A84B' : '#94a3b8',
              })}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <a href={`/r/${slug}/kitchen`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', color: '#94a3b8', fontSize: 14, textDecoration: 'none', borderRadius: 8, marginBottom: 4 }}>
            <span>👨‍🍳</span> Kitchen View
          </a>
          <a href={`/r/${slug}/menu`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', color: '#94a3b8', fontSize: 14, textDecoration: 'none', borderRadius: 8, marginBottom: 4 }}>
            <span>🔗</span> View Menu
          </a>
          {user?.role === 'platform_admin' && (
            <a href="/platform" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', color: '#C8A84B', fontWeight: 600, fontSize: 14, textDecoration: 'none', borderRadius: 8, marginBottom: 4 }}>
              <span>⚡</span> Platform Admin
            </a>
          )}
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 14, textAlign: 'left', borderRadius: 8, cursor: 'pointer' }}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        background: '#f8fafc',
        overflow: 'auto',
        marginTop: isMobile ? 56 : 0,
        minHeight: isMobile ? 'calc(100vh - 56px)' : '100vh',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
