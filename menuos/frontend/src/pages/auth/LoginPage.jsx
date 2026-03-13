import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRoleChoice, setShowRoleChoice] = useState(false);
  const [userData, setUserData] = useState(null);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === 'platform_admin') {
        setUserData(user);
        setShowRoleChoice(true);
        setLoading(false);
        return;
      }
      if (user.role === 'kitchen') return navigate(`/r/${user.restaurant_slug}/kitchen`);
      navigate(`/r/${user.restaurant_slug}/admin`);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleRoleChoice = (destination) => {
    if (destination === 'platform') navigate('/platform');
    else navigate(`/r/${userData.restaurant_slug}/admin`);
  };

  if (showRoleChoice && userData) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.logo}>🍽 MenuOS</div>
          <h1 style={S.title}>Welcome, {userData.name}</h1>
          <p style={S.sub}>You have platform admin access. Choose where to go:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => handleRoleChoice('restaurant')} style={{ ...S.choiceBtn, background: '#C8A84B' }}>
              🏪 My Restaurant Dashboard
            </button>
            <button onClick={() => handleRoleChoice('platform')} style={{ ...S.choiceBtn, background: '#7C3AED' }}>
              ⚡ Platform Admin Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>🍽 MenuOS</div>
        <h1 style={S.title}>Welcome back</h1>
        <p style={S.sub}>Sign in to your restaurant dashboard</p>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={S.form}>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" required value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="owner@restaurant.com" />
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" required value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
          <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={S.foot}>Don't have an account? <Link to="/signup" style={{ color: '#C8A84B' }}>Create one</Link></p>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', padding: 20 },
  card: { background: '#fff', borderRadius: 12, padding: '48px 40px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { fontSize: 28, fontFamily: 'Playfair Display, serif', color: '#1A1A2E', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 4 },
  sub: { color: '#64748b', fontSize: 15, marginBottom: 28 },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 10 },
  input: { padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, outline: 'none' },
  btn: { marginTop: 20, padding: '12px', background: '#C8A84B', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600 },
  foot: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' },
  choiceBtn: { padding: '16px', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
};
