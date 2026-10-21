import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// One Stripe Customer per pro, reused across every checkout (quote fee or
// subscription) rather than letting Checkout create one ad hoc per session —
// keeps billing history, payment methods, and Radar's risk signal attached
// to a single identity instead of fragmenting across sessions.
export async function getOrCreateStripeCustomerId(
  proProfile: { id: string; stripeCustomerId: string | null },
  email: string,
): Promise<string> {
  if (proProfile.stripeCustomerId) return proProfile.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { proProfileId: proProfile.id },
  });

  await prisma.proProfile.update({
    where: { id: proProfile.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
