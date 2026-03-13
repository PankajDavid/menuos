import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../../api/queries.js';

const PLAN_PRICES = {
  free: { monthly: 0, yearly: 0 },
  basic: { monthly: 999, yearly: 9990 },
  pro: { monthly: 2499, yearly: 24990 },
  premium: { monthly: 4999, yearly: 49990 }
};

const PLAN_FEATURES = {
  free: ['Up to 50 menu items', 'Basic QR code', 'Email support'],
  basic: ['Unlimited menu items', 'Custom QR code', 'Priority support', 'Basic analytics'],
  pro: ['Everything in Basic', 'Photo uploads (100/month)', 'Advanced analytics', 'Kitchen display'],
  premium: ['Everything in Pro', 'Unlimited photos & videos', 'White-label option', 'Dedicated support']
};

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };

export default function Subscription() {
  const { slug } = useParams();
  const qc = useQueryClient();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', slug],
    queryFn: () => billingApi.getInvoices(slug),
  });

  const currentPlan = invoices[0]?.plan || 'free';
  const currentStatus = invoices[0]?.status === 'paid' ? 'active' : 'pending';

  const handleRenew = (plan) => {
    // In a real app, this would redirect to payment gateway
    alert(`Redirecting to payment for ${plan} plan...\nAmount: ₹${PLAN_PRICES[plan][billingCycle]}`);
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Subscription</h1>
          <p style={{ color: '#64748b' }}>Manage your plan and billing</p>
        </div>
        <Link 
          to={`/r/${slug}/admin/invoices`}
          style={{ 
            padding: '10px 20px', 
            background: '#f1f5f9', 
            color: '#374151', 
            borderRadius: 8, 
            fontSize: 14, 
            textDecoration: 'none' 
          }}
        >
          View Invoices
        </Link>
      </div>

      {/* Current Plan Status */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Current Plan</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ 
            padding: '12px 24px', 
            background: PLAN_COLORS[currentPlan], 
            color: '#fff', 
            borderRadius: 8,
            fontSize: 20,
            fontWeight: 700,
            textTransform: 'capitalize'
          }}>
            {currentPlan}
          </div>
          <div>
            <div style={{ fontSize: 14, color: '#64748b' }}>Status</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: currentStatus === 'active' ? '#16A34A' : '#92400e', textTransform: 'capitalize' }}>
              {currentStatus}
            </div>
          </div>
          {invoices[0]?.due_date && (
            <div>
              <div style={{ fontSize: 14, color: '#64748b' }}>Next Payment Due</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                {new Date(invoices[0].due_date).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 4, display: 'flex' }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '10px 24px',
              background: billingCycle === 'monthly' ? '#fff' : 'transparent',
              color: billingCycle === 'monthly' ? '#1e293b' : '#64748b',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '10px 24px',
              background: billingCycle === 'yearly' ? '#fff' : 'transparent',
              color: billingCycle === 'yearly' ? '#1e293b' : '#64748b',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: billingCycle === 'yearly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Yearly <span style={{ color: '#16A34A', fontSize: 12 }}>(Save 2 months)</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
        {Object.entries(PLAN_PRICES).map(([plan, prices]) => {
          const isCurrent = plan === currentPlan;
          const price = prices[billingCycle];
          
          return (
            <div 
              key={plan}
              style={{ 
                background: '#fff', 
                borderRadius: 12, 
                padding: 24, 
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                border: isCurrent ? `3px solid ${PLAN_COLORS[plan]}` : '2px solid transparent',
                position: 'relative'
              }}
            >
              {isCurrent && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: PLAN_COLORS[plan],
                  color: '#fff',
                  padding: '4px 16px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  Current Plan
                </div>
              )}
              
              <h3 style={{ 
                fontSize: 20, 
                fontWeight: 700, 
                color: PLAN_COLORS[plan], 
                textTransform: 'capitalize',
                marginBottom: 8 
              }}>
                {plan}
              </h3>
              
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#1e293b' }}>₹{price}</span>
                <span style={{ color: '#64748b' }}>/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                {PLAN_FEATURES[plan].map((feature, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: '#374151' }}>
                    <span style={{ color: '#16A34A' }}>✓</span> {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleRenew(plan)}
                disabled={isCurrent && currentStatus === 'active'}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: isCurrent ? (currentStatus === 'active' ? '#dcfce7' : PLAN_COLORS[plan]) : PLAN_COLORS[plan],
                  color: isCurrent ? (currentStatus === 'active' ? '#16A34A' : '#fff') : '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isCurrent && currentStatus === 'active' ? 'default' : 'pointer',
                  opacity: isCurrent && currentStatus === 'active' ? 0.7 : 1
                }}
              >
                {isCurrent 
                  ? (currentStatus === 'active' ? 'Current Plan' : 'Renew')
                  : 'Upgrade'
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment Info */}
      <div style={{ marginTop: 32, padding: 24, background: '#f8fafc', borderRadius: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>💳 Payment Information</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
          We currently accept manual payments. After selecting a plan, you will receive an invoice with payment instructions.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 14 }}>
            <span>🏦</span> Bank Transfer
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 14 }}>
            <span>📱</span> UPI
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 14 }}>
            <span>💵</span> Cash (at office)
          </div>
        </div>
      </div>
    </div>
  );
}
