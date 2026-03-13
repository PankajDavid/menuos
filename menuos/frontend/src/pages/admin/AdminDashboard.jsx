import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { restaurantApi, billingApi } from '../../api/queries.js';

function QRCodeDisplay({ url, restaurantName }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  
  // Generate QR code using a free API
  const generateQR = async () => {
    try {
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`);
      const blob = await response.blob();
      const dataUrl = URL.createObjectURL(blob);
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate QR:', err);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=500,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Menu QR Code - ${restaurantName}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; text-align: center; }
              .container { border: 2px dashed #ccc; padding: 30px; margin: 20px; }
              h1 { font-size: 24px; margin-bottom: 10px; }
              p { color: #666; margin: 10px 0; }
              .qr { margin: 20px 0; }
              .instructions { font-size: 14px; color: #888; margin-top: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${restaurantName}</h1>
            <p>Scan to view our menu & order</p>
            <div class="qr">
              <img src="${qrDataUrl}" width="300" height="300" />
            </div>
            <p style="font-size: 12px; word-break: break-all;">${url}</p>
            <div class="instructions">
              <p>1. Scan this QR code with your phone camera</p>
              <p>2. Browse the menu and add items to cart</p>
              <p>3. Enter your table number and place order</p>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginTop: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>📱 Menu QR Code</h2>
      <p style={{ color: '#64748b', marginBottom: 16, fontSize: 14 }}>
        Print this QR code and place on tables or provide to customers. All customers will scan the same code and enter their table number at checkout.
      </p>
      
      {!qrDataUrl ? (
        <button 
          onClick={generateQR}
          style={{ padding: '10px 20px', background: '#C8A84B', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Generate QR Code
        </button>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <img src={qrDataUrl} width="250" height="250" style={{ border: '1px solid #e2e8f0', borderRadius: 8 }} />
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button 
              onClick={handlePrint}
              style={{ padding: '10px 20px', background: '#1A1A2E', color: '#C8A84B', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              🖨️ Print QR Code
            </button>
            <button 
              onClick={() => setQrDataUrl('')}
              style={{ padding: '10px 20px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
            >
              Regenerate
            </button>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', wordBreak: 'break-all' }}>{url}</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color = '#2563EB' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SubscriptionCard({ subscription }) {
  const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return { bg: '#dcfce7', text: '#16A34A' };
      case 'grace_period': return { bg: '#fef3c7', text: '#92400e' };
      case 'suspended': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const statusColors = getStatusColor(subscription?.subscription_status);
  const isExpiringSoon = subscription?.next_payment_date && 
    new Date(subscription.next_payment_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24, border: isExpiringSoon ? '2px solid #ef4444' : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>📋 Subscription</h2>
          <p style={{ color: '#64748b', fontSize: 14 }}>Manage your plan and billing</p>
        </div>
        <span style={{ 
          padding: '6px 12px', 
          borderRadius: 20, 
          fontSize: 12, 
          fontWeight: 600, 
          background: statusColors.bg, 
          color: statusColors.text,
          textTransform: 'capitalize'
        }}>
          {subscription?.subscription_status || 'Active'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Current Plan</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: PLAN_COLORS[subscription?.subscription_plan] || '#64748b', textTransform: 'capitalize' }}>
            {subscription?.subscription_plan || 'Free'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Next Payment</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: isExpiringSoon ? '#ef4444' : '#1e293b' }}>
            {subscription?.next_payment_date ? new Date(subscription.next_payment_date).toLocaleDateString() : 'N/A'}
            {isExpiringSoon && <span style={{ color: '#ef4444', fontSize: 12, marginLeft: 8 }}>⚠️ Expiring Soon</span>}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Monthly Fee</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            ₹{parseFloat(subscription?.platform_fee_amount || 0).toFixed(0)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Payment Status</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: subscription?.payment_status === 'paid' ? '#16A34A' : subscription?.payment_status === 'overdue' ? '#dc2626' : '#92400e', textTransform: 'capitalize' }}>
            {subscription?.payment_status || 'Pending'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <Link 
          to="subscription"
          style={{ 
            padding: '10px 20px', 
            background: '#C8A84B', 
            color: '#fff', 
            borderRadius: 8, 
            fontSize: 14, 
            fontWeight: 600, 
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          {subscription?.subscription_status === 'suspended' ? 'Reactivate' : 'Renew / Upgrade'}
        </Link>
        <Link 
          to="invoices"
          style={{ 
            padding: '10px 20px', 
            background: '#f1f5f9', 
            color: '#374151', 
            borderRadius: 8, 
            fontSize: 14, 
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          View Invoices
        </Link>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { slug } = useParams();
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', slug],
    queryFn: () => restaurantApi.getAnalytics(slug),
    refetchInterval: 60000,
  });
  const { data: invoices } = useQuery({
    queryKey: ['invoices', slug],
    queryFn: () => billingApi.getInvoices(slug),
  });

  // Use frontend URL for QR code
  const menuUrl = `https://soothing-embrace-production.up.railway.app/r/${slug}/menu`;

  // Get subscription info from invoices or use defaults
  const subscription = invoices?.[0] ? {
    subscription_plan: invoices[0].plan,
    subscription_status: 'active',
    next_payment_date: invoices[0].due_date,
    platform_fee_amount: invoices[0].final_amount,
    payment_status: invoices[0].status
  } : null;

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Dashboard</h1>
      <p style={{ color: '#64748b', marginBottom: 28 }}>Today's snapshot for your restaurant</p>

      {/* Subscription Card */}
      <SubscriptionCard subscription={subscription} />

      {isLoading ? (
        <div style={{ color: '#94a3b8' }}>Loading analytics…</div>
      ) : analytics ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard icon="💰" label="Revenue Today" value={`₹${parseFloat(analytics.revenue_today).toFixed(0)}`} color="#16A34A" />
            <StatCard icon="📋" label="Orders Today" value={analytics.orders_today} color="#2563EB" />
            <StatCard icon="🍽" label="Most Ordered" value={analytics.top_dish?.name || '—'} color="#C8A84B" />
            <StatCard icon="📊" label="Avg Order Value" value={`₹${parseFloat(analytics.avg_order_value).toFixed(0)}`} color="#7C3AED" />
          </div>

          {/* Revenue chart (simple bars) */}
          {analytics.revenue_last_7_days?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>Revenue — Last 7 Days</h2>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                {analytics.revenue_last_7_days.map((d, i) => {
                  const max = Math.max(...analytics.revenue_last_7_days.map(x => parseFloat(x.revenue)));
                  const h = max > 0 ? (parseFloat(d.revenue) / max) * 100 : 0;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>₹{parseFloat(d.revenue).toFixed(0)}</div>
                      <div style={{ width: '100%', height: `${h}%`, background: '#C8A84B', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* QR Code Section */}
          <QRCodeDisplay url={menuUrl} restaurantName={analytics?.restaurant_name || 'Restaurant'} />
        </>
      ) : (
        <div style={{ color: '#94a3b8' }}>No data yet. Start accepting orders!</div>
      )}
    </div>
  );
}
