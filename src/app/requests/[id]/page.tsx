import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { LEAD_FEE_CENTS } from '@/lib/pricing';
import { formatCents, formatDate } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

import { CompleteButton } from './complete-button';
import { MessageThread } from './message-thread';
import { QuoteForm } from './quote-form';
import { QuotesList } from './quotes-list';
import { ReviewForm } from './review-form';

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login`);

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      category: true,
      property: true,
      customer: true,
      quotes: { include: { proProfile: true }, orderBy: { priceCents: 'asc' } },
      booking: { include: { quote: { include: { proProfile: true } }, review: true } },
      messages: { include: { sender: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!request) notFound();

  const isCustomer = request.customerId === session.user.id;
  const proProfile =
    session.user.role === 'PRO' ? await prisma.proProfile.findUnique({ where: { userId: session.user.id } }) : null;
  const myQuote = proProfile ? request.quotes.find((q) => q.proProfileId === proProfile.id) : null;
  const isParticipant =
    isCustomer || request.quotes.some((q) => q.proProfile.userId === session.user.id);

  if (!isParticipant && !proProfile) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm text-gray-500">{request.category.icon} {request.category.name}</span>
            <Badge status={request.status} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {request.property.addressLine1}, {request.property.city}, {request.property.state}{' '}
            {request.property.zip}
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-2">
          <p className="text-gray-700">{request.description}</p>
          {request.photoUrls.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {request.photoUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt="Job photo"
                  className="h-24 w-24 rounded-lg border border-gray-200 object-cover"
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {(request.budgetMinCents || request.budgetMaxCents) && (
              <span>
                Budget: {request.budgetMinCents ? formatCents(request.budgetMinCents) : '—'} to{' '}
                {request.budgetMaxCents ? formatCents(request.budgetMaxCents) : '—'}
              </span>
            )}
            {request.preferredDate && <span>Preferred date: {formatDate(request.preferredDate)}</span>}
          </div>
        </CardContent>
      </Card>

      {request.booking && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Booking</h2>
              <Badge status={request.booking.status} />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {request.booking.quote.proProfile.businessName} · {formatCents(request.booking.totalCents)}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Pay {request.booking.quote.proProfile.businessName} directly for this job — FixItPro doesn't process
              that payment.
            </p>

            {isCustomer && request.booking.status !== 'COMPLETED' && (
              <CompleteButton bookingId={request.booking.id} />
            )}
            {isCustomer && request.booking.status === 'COMPLETED' && !request.booking.review && (
              <div className="mt-2">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Leave a review</h3>
                <ReviewForm bookingId={request.booking.id} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!request.booking && (
        <div className="mb-6">
          <h2 className="mb-3 font-bold text-gray-900">Quotes</h2>
          <QuotesList quotes={request.quotes} isCustomer={isCustomer} requestBooked={!!request.booking} />
        </div>
      )}

      {proProfile && !myQuote && !request.booking && (
        <Card className="mb-6">
          <CardContent>
            <h2 className="mb-3 font-bold text-gray-900">Submit a quote</h2>
            <QuoteForm
              requestId={request.id}
              hasActiveSubscription={proProfile.subscriptionStatus === 'ACTIVE'}
              leadFeeDollars={LEAD_FEE_CENTS / 100}
            />
          </CardContent>
        </Card>
      )}

      {(isCustomer || myQuote) && (
        <Card>
          <CardContent>
            <h2 className="mb-3 font-bold text-gray-900">Messages</h2>
            <MessageThread requestId={request.id} messages={request.messages} currentUserId={session.user.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
