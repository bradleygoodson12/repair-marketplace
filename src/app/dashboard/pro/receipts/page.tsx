import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { formatCents, formatDate } from '@/lib/utils';

export default async function ProReceiptsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'PRO') redirect('/dashboard/customer');

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) redirect('/dashboard/pro');

  // Invoices are Stripe's own record, not ours — every fee we charge (quote
  // fee, change order fee, subscription) requests one at checkout time (see
  // quote-fee.ts / change-order-fee.ts) or gets one automatically each
  // billing cycle (subscriptions), so Stripe is the complete, authoritative
  // list rather than something we'd reconstruct from our own tables.
  let invoices: Awaited<ReturnType<typeof stripe.invoices.list>>['data'] = [];
  let loadError = false;
  if (proProfile.stripeCustomerId) {
    try {
      const result = await stripe.invoices.list({ customer: proProfile.stripeCustomerId, limit: 100 });
      invoices = result.data.filter((inv) => inv.status === 'paid');
    } catch (error) {
      console.error('Failed to load Stripe invoices', error);
      loadError = true;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
          <p className="text-sm text-gray-500">
            Every fee Repair Bee has charged you, with a Stripe-generated invoice for your records.
          </p>
        </div>
        <Link href="/dashboard/pro" className="text-sm font-medium text-brand-600 hover:underline">
          Back to dashboard
        </Link>
      </div>

      {loadError && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent>
            <p className="text-sm text-red-700">
              Couldn&apos;t load your receipts right now — try again shortly.
            </p>
          </CardContent>
        </Card>
      )}

      {!loadError && invoices.length === 0 ? (
        <p className="text-gray-500">No paid fees yet — receipts show up here once you&apos;ve been charged.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {invoice.lines.data[0]?.description || invoice.description || 'Repair Bee fee'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {invoice.status_transitions.paid_at
                      ? formatDate(new Date(invoice.status_transitions.paid_at * 1000))
                      : formatDate(new Date(invoice.created * 1000))}
                    {invoice.number && <> · Invoice #{invoice.number}</>}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">{formatCents(invoice.amount_paid)}</span>
                  {invoice.invoice_pdf && (
                    <a
                      href={invoice.invoice_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      Download PDF
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
