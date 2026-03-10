import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

const STEPS = ['Account', 'Restaurant', 'Review'];

export default function SignupPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ownerName: '', email: '', password: '', restaurantName: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signup = useAuthStore(s => s.signup);
  const navigate = useNavigate();

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const nextStep = (e) => { e.preventDefault(); setStep(s => s + 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { restaurant } = await signup(form);
      navigate(`/r/${restaurant.slug}/admin`);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>🍽 MenuOS</div>
        <h1 style={S.title}>Create your restaurant</h1>

        {/* Step indicator */}
        <div style={S.steps}>
          {STEPS.map((label, i) => (
            <div key={i} style={S.stepItem}>
              <div style={{ ...S.stepCircle, background: i <= step ? '#C8A84B' : '#e2e8f0', color: i <= step ? '#fff' : '#94a3b8' }}>{i + 1}</div>
              <span style={{ ...S.stepLabel, color: i <= step ? '#1e293b' : '#94a3b8' }}>{label}</span>
            </div>
          ))}
        </div>

        {error && <div style={S.error}>{error}</div>}

        {step === 0 && (
          <form onSubmit={nextStep} style={S.form}>
            <label style={S.label}>Your Name</label>
            <input style={S.input} required value={form.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder="John Smith" />
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" required value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@restaurant.com" />
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" required minLength={8} value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min. 8 characters" />
            <button style={S.btn}>Continue →</button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={nextStep} style={S.form}>
            <label style={S.label}>Restaurant Name</label>
            <input style={S.input} required value={form.restaurantName} onChange={e => update('restaurantName', e.target.value)} placeholder="Maison Dorée" />
            <label style={S.label}>Phone</label>
            <input style={S.input} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 98765 43210" />
            <label style={S.label}>Address</label>
            <textarea style={{ ...S.input, resize: 'vertical', minHeight: 80 }} value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Street, City" />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep(0)} style={{ ...S.btn, background: '#f1f5f9', color: '#374151', flex: 1 }}>← Back</button>
              <button style={{ ...S.btn, flex: 2 }}>Review →</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} style={S.form}>
            <div style={S.review}>
              <ReviewRow label="Name" value={form.ownerName} />
              <ReviewRow label="Email" value={form.email} />
              <ReviewRow label="Restaurant" value={form.restaurantName} />
              {form.phone && <ReviewRow label="Phone" value={form.phone} />}
              {form.address && <ReviewRow label="Address" value={form.address} />}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setStep(1)} style={{ ...S.btn, background: '#f1f5f9', color: '#374151', flex: 1 }}>← Back</button>
              <button style={{ ...S.btn, flex: 2, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? 'Creating…' : '🚀 Launch Restaurant'}
              </button>
            </div>
          </form>
        )}

        <p style={S.foot}>Already have an account? <Link to="/login" style={{ color: '#C8A84B' }}>Sign in</Link></p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ width: 100, color: '#64748b', fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 14 }}>{value}</span>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', padding: 20 },
  card: { background: '#fff', borderRadius: 12, padding: '48px 40px', width: '100%', maxWidth: 460, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { fontSize: 28, fontFamily: 'Playfair Display, serif', color: '#1A1A2E', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 20 },
  steps: { display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' },
  stepItem: { display: 'flex', alignItems: 'center', gap: 6, flex: 1 },
  stepCircle: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  stepLabel: { fontSize: 13, fontWeight: 500 },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 10 },
  input: { padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, outline: 'none' },
  btn: { marginTop: 16, padding: '12px', background: '#C8A84B', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600 },
  review: { background: '#f8fafc', borderRadius: 8, padding: '16px 20px', marginBottom: 4 },
  foot: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' },
};
