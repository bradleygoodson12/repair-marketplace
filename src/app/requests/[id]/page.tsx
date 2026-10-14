import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';

import { AttachmentThumb } from '@/components/attachment-thumb';
import { ReportButton } from '@/components/report-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { formatCents, formatDate } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

import { CancelBookingButton } from './cancel-booking-button';
import { CompleteButton } from './complete-button';
import { MessagePoller } from './message-poller';
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
    session.user.role === 'PRO'
      ? await prisma.proProfile.findUnique({
          where: { userId: session.user.id },
          include: { quickQuoteTemplates: { orderBy: { createdAt: 'asc' } } },
        })
      : null;
  const myQuote = proProfile ? request.quotes.find((q) => q.proProfileId === proProfile.id) : null;
  const isBookedPro = !!request.booking && request.booking.quote.proProfile.userId === session.user.id;
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
            {request.postedAsAgent && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                Agent referral
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {request.property.addressLine1}, {request.property.city}, {request.property.state}{' '}
            {request.property.zip}
          </p>
        </div>
        {!isCustomer && <ReportButton targetRequestId={request.id} label="Report this job" />}
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-2">
          <p className="text-gray-700">{request.description}</p>
          {request.photoUrls.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {request.photoUrls.map((url) => (
                <AttachmentThumb key={url} url={url} />
              ))}
            </div>
          )}
          {request.sourcePageNumber && (
            <p className="text-sm text-gray-500">
              📄 Referenced on page {request.sourcePageNumber} of the attached report.
            </p>
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
          {!isCustomer && myQuote && (
            <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
              {request.customer.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={request.customer.image} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                  {request.customer.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {request.customer.name}
                  {request.postedAsAgent && <span className="font-normal text-gray-500"> (agent)</span>}
                </p>
                <p className="text-gray-500">
                  {request.customer.email}
                  {request.customer.phone && <> · {request.customer.phone}</>}
                </p>
              </div>
            </div>
          )}
          {!isCustomer && myQuote && request.postedAsAgent && (request.clientName || request.clientEmail || request.clientPhone) && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm">
              <p className="font-medium text-amber-900">Actual client — coordinate scheduling with them</p>
              <p className="text-amber-800">
                {request.clientName}
                {request.clientEmail && <> · {request.clientEmail}</>}
                {request.clientPhone && <> · {request.clientPhone}</>}
              </p>
            </div>
          )}
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
              Pay {request.booking.quote.proProfile.businessName} directly for this job — Repair Bee doesn't process
              that payment.
            </p>

            {request.booking.status === 'CANCELLED' && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <p>
                  Cancelled by {request.booking.cancelledByRole === 'CUSTOMER' ? 'the customer' : 'the pro'}
                  {request.booking.cancelledAt && ` on ${formatDate(request.booking.cancelledAt)}`}.
                </p>
                {request.booking.cancelReason && <p className="mt-1 italic">"{request.booking.cancelReason}"</p>}
              </div>
            )}

            {isCustomer && request.booking.status !== 'COMPLETED' && request.booking.status !== 'CANCELLED' && (
              <div className="flex flex-wrap items-center gap-2">
                <CompleteButton bookingId={request.booking.id} />
                <CancelBookingButton bookingId={request.booking.id} />
              </div>
            )}
            {isBookedPro && request.booking.status !== 'COMPLETED' && request.booking.status !== 'CANCELLED' && (
              <CancelBookingButton bookingId={request.booking.id} />
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

      {proProfile && !myQuote && !request.booking && proProfile.verified && proProfile.subscriptionStatus === 'ACTIVE' && (
        <Card className="mb-6">
          <CardContent>
            <h2 className="mb-3 font-bold text-gray-900">Submit a quote</h2>
            <QuoteForm
              requestId={request.id}
              defaultMessage={proProfile.defaultQuoteMessage}
              defaultDurationDays={proProfile.defaultDurationDays}
              templates={proProfile.quickQuoteTemplates}
            />
          </CardContent>
        </Card>
      )}

      {proProfile && !myQuote && !request.booking && !proProfile.verified && (
        <Card className="mb-6">
          <CardContent>
            <p className="text-sm text-gray-600">
              Your profile is still awaiting verification. You'll be able to submit quotes once it's reviewed.
            </p>
          </CardContent>
        </Card>
      )}

      {proProfile && !myQuote && !request.booking && proProfile.verified && proProfile.subscriptionStatus !== 'ACTIVE' && (
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              An active subscription is required to submit quotes. Subscribe from your dashboard to quote this job.
            </p>
            <Link href="/dashboard/pro">
              <Button size="sm">Subscribe</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {(isCustomer || myQuote) && (
        <Card>
          <CardContent>
            <MessagePoller />
            <h2 className="mb-3 font-bold text-gray-900">Messages</h2>
            <MessageThread requestId={request.id} messages={request.messages} currentUserId={session.user.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
