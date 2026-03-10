import { randomUUID } from 'crypto';

/**
 * Mock payment processor.
 * Replace this entire function with Razorpay/Stripe when ready.
 *
 * Razorpay swap:
 *   import Razorpay from 'razorpay';
 *   const rzp = new Razorpay({ key_id, key_secret });
 *   const order = await rzp.orders.create({ amount: amount * 100, currency: 'INR' });
 *
 * Stripe swap:
 *   import Stripe from 'stripe';
 *   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
 *   const pi = await stripe.paymentIntents.create({ amount: amount * 100, currency: 'usd' });
 */
export async function mockPayment(amount) {
  // Simulate 200-800ms network latency
  await new Promise(r => setTimeout(r, 200 + Math.random() * 600));

  // 5% failure rate for testing error paths
  if (Math.random() < 0.05) {
    return { status: 'failed', error: 'Payment declined by bank. Please try a different card.' };
  }

  return {
    status: 'success',
    transactionId: 'TXN_' + randomUUID().split('-')[0].toUpperCase(),
    amount,
    currency: 'INR',
    processedAt: new Date().toISOString(),
    provider: 'mock',
  };
}
