import { useLocation, useParams, Link } from 'react-router-dom';

export default function OrderConfirmation() {
  const { slug } = useParams();
  const { state } = useLocation();
  const order = state?.order;

  return (
    <div style={{ minHeight: '100vh', background: '#0C0A07', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, color: '#C8A84B', marginBottom: 8 }}>Order Placed!</h1>
        {order && (
          <>
            <p style={{ color: '#F2E8D0', fontSize: 18, marginBottom: 4 }}>Order #{order.order_number}</p>
            <p style={{ color: '#A89880', marginBottom: 4 }}>Table {order.table_number}</p>
            <p style={{ color: '#C8A84B', fontSize: 20, fontFamily: 'Playfair Display, serif', marginBottom: 20 }}>₹{parseFloat(order.total_amount).toFixed(2)}</p>
          </>
        )}
        <p style={{ color: '#A89880', fontSize: 15, marginBottom: 28 }}>Your order has been sent to the kitchen. We'll prepare it shortly! 🍽</p>
        <Link to={`/r/${slug}/menu`} style={{ background: '#C8A84B', color: '#0C0A07', padding: '12px 28px', borderRadius: 6, fontWeight: 700, textDecoration: 'none', fontSize: 16 }}>
          Order More
        </Link>
      </div>
    </div>
  );
}
