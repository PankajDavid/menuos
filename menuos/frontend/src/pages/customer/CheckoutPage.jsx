import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore.js';
import { orderApi } from '../../api/queries.js';

export default function CheckoutPage() {
  const { slug } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const items = useCartStore(s => s.items);
  const clearCart = useCartStore(s => s.clearCart);
  const total = items.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
  const [mobile, setMobile] = useState('');
  const [tableNumber, setTableNumber] = useState(state?.tableNumber || '');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('idle'); // idle | paying | placing | done | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleOrder = async () => {
    if (!customerName.trim()) return setErrorMsg('Please enter your name');
    if (!mobile || mobile.length < 10) return setErrorMsg('Enter a valid mobile number');
    if (!tableNumber) return setErrorMsg('Table number is required');
    setErrorMsg(''); setStatus('paying');

    try {
      // Step 1: Process payment
      const payment = await orderApi.pay(slug, total);
      if (payment.status !== 'success') {
        setStatus('error'); setErrorMsg(payment.error || 'Payment failed. Please try again.'); return;
      }

      setStatus('placing');

      // Step 2: Create order
      const order = await orderApi.create(slug, {
        customer_name: customerName,
        mobile_number: mobile,
        table_number: tableNumber,
        notes,
        payment_tx_id: payment.transactionId,
        items: items.map(i => ({ menu_item_id: i.id, quantity: i.qty })),
      });

      clearCart();
      navigate(`/r/${slug}/order-confirm`, { state: { order } });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  if (items.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Your cart is empty. <a href={`/r/${slug}/menu`}>Back to menu</a></div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0C0A07', color: '#F2E8D0', fontFamily: "'Crimson Text', serif", padding: '20px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#A89880', fontSize: 16, marginBottom: 20, cursor: 'pointer' }}>← Back</button>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: '#C8A84B', marginBottom: 24 }}>Your Order</h1>

        {/* Items */}
        <div style={{ background: '#161310', borderRadius: 8, padding: 20, marginBottom: 20 }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2A2520' }}>
              <span>{item.name} × {item.qty}</span>
              <span style={{ color: '#C8A84B' }}>₹{(parseFloat(item.price) * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontFamily: 'Playfair Display, serif', fontSize: 20 }}>
            <span>Total</span><span style={{ color: '#C8A84B' }}>₹{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: 13, color: '#A89880', display: 'block', marginBottom: 6 }}>Your Name *</label>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Doe"
              style={{ width: '100%', padding: '10px 14px', background: '#161310', border: '1px solid #2A2520', borderRadius: 6, color: '#F2E8D0', fontSize: 15 }} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#A89880', display: 'block', marginBottom: 6 }}>Mobile Number *</label>
            <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91 98765 43210" type="tel"
              style={{ width: '100%', padding: '10px 14px', background: '#161310', border: '1px solid #2A2520', borderRadius: 6, color: '#F2E8D0', fontSize: 15 }} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#A89880', display: 'block', marginBottom: 6 }}>Table Number *</label>
            <input value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="e.g. T2, 5, etc."
              style={{ width: '100%', padding: '10px 14px', background: '#161310', border: '1px solid #2A2520', borderRadius: 6, color: '#F2E8D0', fontSize: 15 }} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#A89880', display: 'block', marginBottom: 6 }}>Special Instructions (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="No spice, extra sauce…"
              style={{ width: '100%', padding: '10px 14px', background: '#161310', border: '1px solid #2A2520', borderRadius: 6, color: '#F2E8D0', fontSize: 15, resize: 'vertical', minHeight: 80 }} />
          </div>
        </div>

        {errorMsg && <div style={{ background: '#450a0a', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{errorMsg}</div>}

        <button onClick={handleOrder} disabled={['paying', 'placing'].includes(status)}
          style={{ width: '100%', padding: 16, background: status === 'error' ? '#dc2626' : '#C8A84B', color: '#0C0A07', border: 'none', borderRadius: 6, fontSize: 18, fontWeight: 700, fontFamily: 'Playfair Display, serif', opacity: ['paying','placing'].includes(status) ? 0.8 : 1 }}>
          {status === 'paying' ? '⏳ Processing payment…' : status === 'placing' ? '🍽 Placing order…' : `Pay ₹${total.toFixed(2)} & Order`}
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#A89880', marginTop: 10 }}>🔒 Secure mock payment — no real charges</p>
      </div>
    </div>
  );
}
