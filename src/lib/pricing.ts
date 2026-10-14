// Pros are paid by customers directly, outside the app. The only money the
// app ever charges a pro is for sending quotes — either a flat fee per
// quote or a monthly subscription for unlimited quoting. Every pro must
// still be admin-vetted (`verified`) regardless of which billing mode they
// pick, and all leads are visible to every verified pro for free; the fee
// (if any) applies only when a pro actually submits a quote.
export const SUBSCRIPTION_PRICE_CENTS = 2000; // $20/month
export const QUOTE_PRICE_CENTS = 500; // $5/quote, pay only when you send one
