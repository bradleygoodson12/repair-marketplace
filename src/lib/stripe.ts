import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;

// A placeholder key lets the app boot in dev before Stripe keys are configured;
// any real checkout/webhook call will still fail loudly against the test account.
export const stripe = new Stripe(secretKey || 'sk_test_placeholder', {
  apiVersion: '2026-08-26.dahlia',
});
