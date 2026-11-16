import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';

import { AttachmentThumb } from '@/components/attachment-thumb';
import { ReportButton } from '@/components/report-button';
import { PayQuoteFeeButton } from '@/components/pay-quote-fee-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { QUOTE_PRICE_CENTS } from '@/lib/pricing';
import { formatCents, formatDate } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

import { PayChangeOrderFeeButton } from '@/components/pay-change-order-fee-button';

import { BookingDocuments } from './booking-documents';
import { CancelBookingButton } from './cancel-booking-button';
import { ChangeOrderActions } from './change-order-actions';
import { CompleteButton } from './complete-button';
import { MessagePoller } from './message-poller';
import { MessageThread } from './message-thread';
import { PostUpdateForm } from './post-update-form';
import { QuoteForm } from './quote-form';
import { QuotesList } from './quotes-list';
import { ReviewForm } from './review-form';
import { ScheduleAppointmentForm } from './schedule-appointment-form';
import { SubmitChangeOrderForm } from './submit-change-order-form';

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
      booking: {
        include: {
          quote: { include: { proProfile: true } },
          review: true,
          updates: { orderBy: { createdAt: 'asc' } },
          changeOrders: { orderBy: { createdAt: 'asc' } },
        },
      },
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

  // A pay-per-quote fee owed but unpaid holds the quote back from the
  // customer and other pros — it exists but isn't "live" until paid (or
  // was free because the pro was an active subscriber at submission time).
  const myQuoteIsLive = !!myQuote && (!myQuote.quoteFeeRequiredCents || !!myQuote.quoteFeePaidAt);
  const visibleQuotes = request.quotes.filter((q) => !q.quoteFeeRequiredCents || q.quoteFeePaidAt);

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
          {!isCustomer && myQuoteIsLive && (
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
          {!isCustomer && myQuoteIsLive && request.postedAsAgent && (request.clientName || request.clientEmail || request.clientPhone) && (
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

            {(isCustomer || isBookedPro) && (request.booking.status === 'SCHEDULED' || request.booking.status === 'IN_PROGRESS') && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span>
                  Appointment:{' '}
                  {request.booking.scheduledDate.toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <ScheduleAppointmentForm bookingId={request.booking.id} scheduledDate={request.booking.scheduledDate} />
              </div>
            )}

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

            {(request.booking.updates.length > 0 || isBookedPro) && (
              <div className="mt-2 border-t border-gray-100 pt-3">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Progress updates</h3>
                {request.booking.updates.length === 0 ? (
                  <p className="text-sm text-gray-500">No updates posted yet.</p>
                ) : (
                  <div className="mb-3 flex flex-col gap-3">
                    {request.booking.updates.map((u) => (
                      <div key={u.id} className="rounded-lg bg-gray-50 p-3">
                        <p className="mb-1 text-xs text-gray-400">{formatDate(u.createdAt)}</p>
                        <p className="whitespace-pre-wrap text-sm text-gray-700">{u.note}</p>
                        {u.photoUrls.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-3">
                            {u.photoUrls.map((url) => (
                              <AttachmentThumb key={url} url={url} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {isBookedPro && (request.booking.status === 'SCHEDULED' || request.booking.status === 'IN_PROGRESS') && (
                  <PostUpdateForm bookingId={request.booking.id} />
                )}
              </div>
            )}

            {(() => {
              // A fee owed and unpaid holds a change order back from the
              // customer, exactly like an unpaid quote — the booked pro
              // still sees it (with a pay-retry button) so they're not left
              // guessing where it went.
              const visibleChangeOrders = request.booking.changeOrders.filter(
                (co) => isBookedPro || !co.feeRequiredCents || co.feePaidAt,
              );
              const canProposeMore = isBookedPro && (request.booking!.status === 'SCHEDULED' || request.booking!.status === 'IN_PROGRESS');
              if (visibleChangeOrders.length === 0 && !canProposeMore) return null;

              return (
                <div className="mt-2 border-t border-gray-100 pt-3">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">Change orders</h3>
                  {visibleChangeOrders.length === 0 ? (
                    <p className="mb-3 text-sm text-gray-500">No change orders yet.</p>
                  ) : (
                    <div className="mb-3 flex flex-col gap-3">
                      {visibleChangeOrders.map((co) => {
                        const isHidden = !!co.feeRequiredCents && !co.feePaidAt;
                        return (
                          <div key={co.id} className="rounded-lg bg-gray-50 p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs text-gray-400">{formatDate(co.createdAt)}</span>
                              <Badge status={isHidden ? 'PENDING' : co.status} />
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-gray-700">{co.description}</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              +{formatCents(co.additionalPriceCents)}
                            </p>
                            {isHidden && isBookedPro && (
                              <div className="mt-2">
                                <p className="mb-1 text-xs text-gray-500">
                                  Not yet visible to the customer — complete payment to send it.
                                </p>
                                <PayChangeOrderFeeButton changeOrderId={co.id} priceDollars={QUOTE_PRICE_CENTS / 100} />
                              </div>
                            )}
                            {!isHidden && isCustomer && co.status === 'PENDING' && (
                              <div className="mt-2">
                                <ChangeOrderActions changeOrderId={co.id} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {canProposeMore && <SubmitChangeOrderForm bookingId={request.booking!.id} />}
                </div>
              );
            })()}

            {(isBookedPro || request.booking.invoiceUrls.length > 0 || request.booking.warrantyUrls.length > 0) && (
              <div className="mt-2 border-t border-gray-100 pt-3">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Invoices &amp; warranties</h3>
                {isBookedPro ? (
                  <BookingDocuments
                    bookingId={request.booking.id}
                    invoiceUrls={request.booking.invoiceUrls}
                    warrantyUrls={request.booking.warrantyUrls}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {request.booking.invoiceUrls.length === 0 && request.booking.warrantyUrls.length === 0 && (
                      <p className="text-sm text-gray-500">Nothing uploaded yet.</p>
                    )}
                    {request.booking.invoiceUrls.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-500">Invoices</p>
                        <div className="flex flex-wrap gap-3">
                          {request.booking.invoiceUrls.map((url) => (
                            <AttachmentThumb key={url} url={url} />
                          ))}
                        </div>
                      </div>
                    )}
                    {request.booking.warrantyUrls.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-500">Warranties</p>
                        <div className="flex flex-wrap gap-3">
                          {request.booking.warrantyUrls.map((url) => (
                            <AttachmentThumb key={url} url={url} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!request.booking && (
        <div className="mb-6">
          <h2 className="mb-3 font-bold text-gray-900">Quotes</h2>
          <QuotesList quotes={visibleQuotes} isCustomer={isCustomer} requestBooked={!!request.booking} />
        </div>
      )}

      {proProfile && !myQuote && !request.booking && proProfile.verified && (
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

      {proProfile && myQuote && myQuote.quoteFeeRequiredCents && !myQuote.quoteFeePaidAt && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 font-bold text-gray-900">Complete payment to send your quote</h2>
              <p className="text-sm text-gray-600">
                Your quote is saved but not yet visible to the customer — pay the ${QUOTE_PRICE_CENTS / 100} quote
                fee to send it. Subscribe instead for unlimited quotes with no per-quote fee.
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <PayQuoteFeeButton quoteId={myQuote.id} priceDollars={QUOTE_PRICE_CENTS / 100} />
              <Link href="/dashboard/pro" className="text-sm font-medium text-brand-600 hover:underline">
                Subscribe instead
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {(isCustomer || myQuoteIsLive) && (
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
