import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { billingApi } from '../../api/queries.js';

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };

export default function Invoices() {
  const { slug } = useParams();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', slug],
    queryFn: () => billingApi.getInvoices(slug),
  });

  const getStatusBadge = (status) => {
    const styles = {
      paid: { bg: '#dcfce7', text: '#16A34A' },
      pending: { bg: '#fef3c7', text: '#92400e' },
      overdue: { bg: '#fee2e2', text: '#dc2626' },
      cancelled: { bg: '#f3f4f6', text: '#64748b' }
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: style.bg,
        color: style.text,
        textTransform: 'capitalize'
      }}>
        {status}
      </span>
    );
  };

  const handleDownload = (invoice) => {
    // Generate a simple invoice PDF content
    const content = `
INVOICE
=======

Invoice Number: ${invoice.invoice_number}
Date: ${new Date(invoice.created_at).toLocaleDateString()}
Due Date: ${new Date(invoice.due_date).toLocaleDateString()}

Plan: ${invoice.plan.toUpperCase()}
Amount: ₹${parseFloat(invoice.amount).toFixed(2)}
Discount: ₹${parseFloat(invoice.discount_amount).toFixed(2)}
Final Amount: ₹${parseFloat(invoice.final_amount).toFixed(2)}

Status: ${invoice.status.toUpperCase()}
${invoice.paid_date ? `Paid Date: ${new Date(invoice.paid_date).toLocaleDateString()}` : ''}
${invoice.payment_method ? `Payment Method: ${invoice.payment_method}` : ''}

Thank you for your business!
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${invoice.invoice_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Invoices</h1>
          <p style={{ color: '#64748b' }}>View and download your payment history</p>
        </div>
        <Link 
          to={`/r/${slug}/admin/subscription`}
          style={{ 
            padding: '10px 20px', 
            background: '#C8A84B', 
            color: '#fff', 
            borderRadius: 8, 
            fontSize: 14, 
            fontWeight: 600,
            textDecoration: 'none' 
          }}
        >
          Manage Subscription
        </Link>
      </div>

      {isLoading ? (
        <div style={{ color: '#94a3b8' }}>Loading invoices...</div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, background: '#fff', borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No Invoices Yet</h3>
          <p style={{ color: '#64748b', marginBottom: 24 }}>You haven't generated any invoices yet.</p>
          <Link 
            to={`/r/${slug}/admin/subscription`}
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
            View Plans
          </Link>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Invoice #</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Plan</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Discount</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Final</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Due Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px', fontWeight: 600, color: '#1e293b' }}>
                      {invoice.invoice_number}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: PLAN_COLORS[invoice.plan],
                        color: '#fff',
                        textTransform: 'capitalize'
                      }}>
                        {invoice.plan}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#1e293b' }}>
                      ₹{parseFloat(invoice.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '16px', color: '#16A34A' }}>
                      ₹{parseFloat(invoice.discount_amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '16px', fontWeight: 600, color: '#C8A84B' }}>
                      ₹{parseFloat(invoice.final_amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td style={{ padding: '16px', color: '#64748b' }}>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button
                        onClick={() => handleDownload(invoice)}
                        style={{
                          padding: '6px 12px',
                          background: '#f1f5f9',
                          color: '#374151',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        📥 Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Summary */}
      {invoices.length > 0 && (
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Total Paid</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#16A34A' }}>
              ₹{invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.final_amount), 0).toFixed(0)}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Pending</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#92400e' }}>
              ₹{invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + parseFloat(i.final_amount), 0).toFixed(0)}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Total Invoices</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
              {invoices.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
