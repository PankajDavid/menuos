import { Link } from 'react-router-dom';

const FEATURES = [
  { icon: '📱', title: 'QR Ordering', desc: 'Customers scan a QR code at their table and order directly from their phone.' },
  { icon: '👨‍🍳', title: 'Kitchen Dashboard', desc: 'Real-time order management with a live Kanban board for your kitchen staff.' },
  { icon: '🤖', title: 'AI Sommelier', desc: 'Claude-powered AI assistant helps customers choose dishes and get allergy info.' },
  { icon: '📊', title: 'Analytics', desc: 'Revenue, order trends, top dishes and average order value — all in one dashboard.' },
  { icon: '🌍', title: 'Multilingual', desc: 'Your menu automatically adapts to your customer\'s language preference.' },
  { icon: '🔒', title: 'Secure & Scalable', desc: 'Multi-tenant architecture keeps each restaurant\'s data completely isolated.' },
];

const PLANS = [
  { name: 'Free', price: '$0', features: ['20 menu items', '50 orders/month', '5 tables', '1 staff account'] },
  { name: 'Basic', price: '$29', features: ['Unlimited menu', '1,000 orders/month', '25 tables', '3 staff accounts', 'Basic analytics'], highlight: true },
  { name: 'Pro', price: '$79', features: ['Everything in Basic', 'Unlimited orders', 'Unlimited tables', 'Advanced analytics', 'Priority support', 'API access'] },
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#fff' }}>
      {/* Nav */}
      <nav style={{ padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, color: '#1A1A2E' }}>🍽 MenuOS</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" style={{ padding: '8px 20px', color: '#374151', textDecoration: 'none', fontSize: 15 }}>Sign In</Link>
          <Link to="/signup" style={{ padding: '8px 20px', background: '#C8A84B', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 20px 60px', background: 'linear-gradient(180deg, #fffbf0 0%, #fff 100%)' }}>
        <div style={{ fontSize: 13, letterSpacing: '0.2em', color: '#C8A84B', textTransform: 'uppercase', marginBottom: 16 }}>✦ SaaS Restaurant Platform ✦</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 5vw, 64px)', color: '#1A1A2E', lineHeight: 1.15, maxWidth: 800, margin: '0 auto 20px' }}>
          Your Restaurant's Complete Digital Menu System
        </h1>
        <p style={{ fontSize: 18, color: '#64748b', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7 }}>
          QR ordering, kitchen dashboard, AI recommendations, and analytics — all in one platform. Set up in minutes.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/signup" style={{ padding: '14px 32px', background: '#C8A84B', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 17, fontWeight: 700 }}>
            Start Free — No Credit Card
          </Link>
          <a href="#features" style={{ padding: '14px 28px', background: '#f8fafc', color: '#374151', borderRadius: 10, textDecoration: 'none', fontSize: 17, border: '1px solid #e2e8f0' }}>
            See Features
          </a>
        </div>
      </div>

      {/* Features */}
      <div id="features" style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px' }}>
        <h2 style={{ textAlign: 'center', fontFamily: 'Playfair Display, serif', fontSize: 36, marginBottom: 48, color: '#1A1A2E' }}>Everything your restaurant needs</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#f8fafc', borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>{f.title}</h3>
              <p style={{ color: '#64748b', lineHeight: 1.65, fontSize: 15 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ background: '#f8fafc', padding: '60px 20px' }}>
        <h2 style={{ textAlign: 'center', fontFamily: 'Playfair Display, serif', fontSize: 36, marginBottom: 48, color: '#1A1A2E' }}>Simple, transparent pricing</h2>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 900, margin: '0 auto' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: 260, border: plan.highlight ? '2px solid #C8A84B' : '1px solid #e2e8f0', position: 'relative' }}>
              {plan.highlight && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#C8A84B', color: '#fff', padding: '4px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>Most Popular</div>}
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>{plan.name}</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 40, color: '#C8A84B', marginBottom: 20 }}>{plan.price}<span style={{ fontSize: 16, color: '#64748b' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {plan.features.map(f => <li key={f} style={{ color: '#374151', fontSize: 14 }}>✓ {f}</li>)}
              </ul>
              <Link to="/signup" style={{ display: 'block', textAlign: 'center', padding: '11px', background: plan.highlight ? '#C8A84B' : '#f8fafc', color: plan.highlight ? '#fff' : '#374151', borderRadius: 8, textDecoration: 'none', fontWeight: 600, border: plan.highlight ? 'none' : '1px solid #e2e8f0' }}>
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8', fontSize: 14, borderTop: '1px solid #f1f5f9' }}>
        © 2026 MenuOS · Built with ❤️ for restaurateurs everywhere
      </div>
    </div>
  );
}
