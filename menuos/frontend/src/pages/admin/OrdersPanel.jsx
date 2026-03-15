import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi, restaurantApi } from '../../api/queries.js';

const STATUS_COLORS = { pending:'#2563EB', preparing:'#D97706', ready:'#16A34A', served:'#64748b', cancelled:'#dc2626' };

function PrintSlip({ order, restaurant }) {
  const slipRef = useRef();
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${order.order_number}</title>
          <style>
            @media print {
              @page { size: A5; margin: 10mm; }
              body { margin: 0; padding: 8px; font-family: 'Courier New', monospace; font-size: 11px; }
              .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
              .header h2 { margin: 0; font-size: 15px; font-weight: bold; }
              .header .gst { font-size: 9px; color: #666; margin: 3px 0; }
              .header p { margin: 3px 0; font-size: 10px; }
              .info { margin: 8px 0; }
              .info-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 11px; }
              .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin: 8px 0; }
              .item { display: flex; justify-content: space-between; margin: 4px 0; font-size: 11px; }
              .item-name { flex: 1; }
              .item-qty { width: 30px; text-align: center; }
              .item-price { width: 60px; text-align: right; }
              .total { font-weight: bold; font-size: 13px; text-align: right; margin-top: 8px; }
              .tax-note { text-align: center; font-size: 10px; color: #666; margin: 8px 0; font-style: italic; }
              .footer { text-align: center; margin-top: 15px; font-size: 9px; border-top: 1px dashed #000; padding-top: 8px; }
              .notes { background: #fff3cd; padding: 5px; margin: 8px 0; font-style: italic; font-size: 10px; }
              .discount { color: #16A34A; font-size: 11px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${restaurant?.logo_url ? `<img src="${restaurant.logo_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-bottom: 5px;" />` : ''}
            <h2>${restaurant?.name || 'Restaurant'}</h2>
            ${restaurant?.gst_number ? `<div class="gst">GST: ${restaurant.gst_number}</div>` : ''}
            ${restaurant?.address ? `<p style="font-size: 9px; color: #666;">${restaurant.address}</p>` : ''}
            ${restaurant?.phone ? `<p style="font-size: 9px;">📞 ${restaurant.phone}</p>` : ''}
            <p>Order #${order.order_number}</p>
            <p>${new Date(order.created_at).toLocaleString()}</p>
          </div>
          
          <div class="info">
            <div class="info-row"><span>Table:</span><span>${order.table_number}</span></div>
            <div class="info-row"><span>Customer:</span><span>${order.customer_name || 'Guest'}</span></div>
            <div class="info-row"><span>Mobile:</span><span>${order.mobile_number}</span></div>
            <div class="info-row"><span>Status:</span><span>${order.order_status.toUpperCase()}</span></div>
          </div>
          
          <div class="items">
            ${order.items?.filter(Boolean).map(item => `
              <div class="item">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">×${item.quantity}</span>
                <span class="item-price">₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          
          ${order.discount_amount > 0 ? `
            <div class="discount">
              Subtotal: ₹${(parseFloat(order.total_amount) + parseFloat(order.discount_amount)).toFixed(2)}<br/>
              Discount ${order.discount_type === 'percentage' ? `(${order.discount_value}%)` : ''}: -₹${parseFloat(order.discount_amount).toFixed(2)}<br/>
            </div>
          ` : ''}
          
          <div class="total">
            Total: ₹${parseFloat(order.total_amount).toFixed(2)}
          </div>
          
          <div class="tax-note">* All taxes inclusive</div>
          
          ${order.notes ? `<div class="notes">Notes: ${order.notes}</div>` : ''}
          
          <div class="footer">
            <p>Thank you for your order!</p>
            <p>Please keep this slip for your records</p>
          </div>
          
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <button onClick={handlePrint} style={{ padding: '6px 12px', background: '#1A1A2E', color: '#C8A84B', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
      🖨️ Print
    </button>
  );
}

function DiscountModal({ order, onClose, onApply }) {
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply({
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      discount_code: discountCode || null,
      reason: reason || null,
    });
  };

  const subtotal = parseFloat(order.subtotal || order.total_amount + (order.discount_amount || 0));
  const previewDiscount = discountValue
    ? discountType === 'percentage'
      ? (subtotal * parseFloat(discountValue)) / 100
      : Math.min(parseFloat(discountValue), subtotal)
    : 0;
  const newTotal = subtotal - previewDiscount;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxWidth: 400,
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>🏷️ Apply Discount</h3>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
          Order #{order.order_number} - Current Total: ₹{subtotal.toFixed(2)}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setDiscountType('percentage')}
              style={{
                flex: 1,
                padding: 10,
                background: discountType === 'percentage' ? '#C8A84B' : '#f1f5f9',
                border: 'none',
                borderRadius: 6,
                color: discountType === 'percentage' ? '#fff' : '#64748b',
                cursor: 'pointer',
              }}
            >
              Percentage %
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('fixed')}
              style={{
                flex: 1,
                padding: 10,
                background: discountType === 'fixed' ? '#C8A84B' : '#f1f5f9',
                border: 'none',
                borderRadius: 6,
                color: discountType === 'fixed' ? '#fff' : '#64748b',
                cursor: 'pointer',
              }}
            >
              Fixed Amount ₹
            </button>
          </div>

          <input
            type="number"
            value={discountValue}
            onChange={e => setDiscountValue(e.target.value)}
            placeholder={discountType === 'percentage' ? 'Enter % (e.g. 10)' : 'Enter amount (e.g. 50)'}
            style={{
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              fontSize: 14,
            }}
            required
          />

          <input
            type="text"
            value={discountCode}
            onChange={e => setDiscountCode(e.target.value)}
            placeholder="Discount code (optional)"
            style={{
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              fontSize: 14,
            }}
          />

          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for discount (optional)"
            style={{
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              fontSize: 14,
            }}
          />

          {previewDiscount > 0 && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #16A34A',
              borderRadius: 6,
              padding: 12,
              fontSize: 13,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', marginBottom: 4 }}>
                <span>Discount:</span>
                <span>-₹{previewDiscount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, borderTop: '1px solid #16A34A', paddingTop: 4 }}>
                <span>New Total:</span>
                <span>₹{newTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: 10,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!discountValue || parseFloat(discountValue) <= 0}
              style={{
                flex: 1,
                padding: 10,
                background: '#16A34A',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                opacity: (!discountValue || parseFloat(discountValue) <= 0) ? 0.5 : 1,
              }}
            >
              Apply Discount
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrdersPanel() {
  const { slug } = useParams();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [discountOrder, setDiscountOrder] = useState(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', slug, filter],
    queryFn: () => orderApi.getAll(slug, filter ? { status: filter } : {}),
    refetchInterval: 15000,
  });

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', slug],
    queryFn: () => restaurantApi.get(slug),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => orderApi.updateStatus(slug, id, status),
    onSuccess: () => qc.invalidateQueries(['orders', slug]),
  });

  const discountMutation = useMutation({
    mutationFn: ({ id, data }) => orderApi.applyDiscount(slug, id, data),
    onSuccess: () => {
      qc.invalidateQueries(['orders', slug]);
      setDiscountOrder(null);
    },
  });

  const handleApplyDiscount = (data) => {
    if (discountOrder) {
      discountMutation.mutate({ id: discountOrder.id, data });
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Orders</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['', 'pending', 'preparing', 'ready', 'served', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid #e2e8f0', background: filter === s ? '#1A1A2E' : '#fff', color: filter === s ? '#C8A84B' : '#374151', fontSize: 13, cursor: 'pointer' }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {discountOrder && (
        <DiscountModal
          order={discountOrder}
          onClose={() => setDiscountOrder(null)}
          onApply={handleApplyDiscount}
        />
      )}

      {isLoading ? <div>Loading…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => (
            <div key={order.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>#{order.order_number}</span>
                  <span style={{ marginLeft: 12, color: '#64748b', fontSize: 14 }}>Table {order.table_number}</span>
                  <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 13 }}>{order.mobile_number}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ background: STATUS_COLORS[order.order_status] + '20', color: STATUS_COLORS[order.order_status], padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    {order.order_status}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    {order.discount_amount > 0 && (
                      <div style={{ fontSize: 11, color: '#16A34A', textDecoration: 'line-through' }}>
                        ₹{parseFloat(order.subtotal || order.total_amount + order.discount_amount).toFixed(2)}
                      </div>
                    )}
                    <span style={{ color: '#C8A84B', fontWeight: 700, fontSize: 18 }}>₹{parseFloat(order.total_amount).toFixed(2)}</span>
                    {order.discount_amount > 0 && (
                      <div style={{ fontSize: 11, color: '#16A34A' }}>
                        -₹{parseFloat(order.discount_amount).toFixed(2)} {order.discount_type === 'percentage' ? `(${order.discount_value}%)` : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {order.items?.filter(Boolean).map((item, i) => (
                  <span key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>
                    {item.name} ×{item.quantity}
                  </span>
                ))}
              </div>

              {order.notes && <div style={{ color: '#92400e', background: '#fffbeb', padding: '6px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>📝 {order.notes}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(order.created_at).toLocaleString()}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <PrintSlip order={order} restaurant={restaurant} />
                  {!order.discount_amount && !['cancelled'].includes(order.order_status) && (
                    <button
                      onClick={() => setDiscountOrder(order)}
                      style={{ padding: '6px 12px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                    >
                      🏷️ Discount
                    </button>
                  )}
                  {!['served','cancelled'].includes(order.order_status) && (
                    <select value={order.order_status}
                      onChange={e => updateMutation.mutate({ id: order.id, status: e.target.value })}
                      style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                      {['pending','preparing','ready','served','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
          {orders.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>No orders found</div>}
        </div>
      )}
    </div>
  );
}
