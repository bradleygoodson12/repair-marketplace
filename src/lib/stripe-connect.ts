import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Express accounts here exist ONLY to run a pro through Stripe's real KYC
// (business details, EIN, bank account, identity) — we never create a
// Transfer or Charge against one. card_payments/transfers are requested
// because that's what makes Stripe's Express onboarding actually collect
// full verification data; the capabilities being enabled is a side effect
// of KYC completion, not something this app acts on.
async function getOrCreateConnectAccount(proProfileId: string, email: string): Promise<string> {
  const proProfile = await prisma.proProfile.findUniqueOrThrow({ where: { id: proProfileId } });
  if (proProfile.stripeConnectAccountId) return proProfile.stripeConnectAccountId;

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { proProfileId },
  });

  await prisma.proProfile.update({
    where: { id: proProfileId },
    data: { stripeConnectAccountId: account.id },
  });

  return account.id;
}

export async function createConnectOnboardingLink(proProfileId: string, email: string): Promise<string> {
  const accountId = await getOrCreateConnectAccount(proProfileId, email);
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/dashboard/pro?connect=refresh`,
    return_url: `${origin}/dashboard/pro?connect=return`,
    type: 'account_onboarding',
  });

  return accountLink.url;
}
