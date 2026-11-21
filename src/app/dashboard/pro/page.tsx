import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { deriveServiceLocation, getFullCategoryIds } from '@/lib/capacity';
import { QUOTE_PRICE_CENTS, SUBSCRIPTION_PRICE_CENTS } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { formatCents, formatDate } from '@/lib/utils';
import { zipDistanceMiles } from '@/lib/zip';

import { AtAGlance } from './at-a-glance';
import { ConnectVerificationCard } from './connect-verification-card';
import { EditProfileToggle } from './edit-profile-toggle';
import { LeadCard } from './lead-card';
import { PaymentStatusBanner } from './payment-status-banner';
import { ProProfileForm } from './profile-form';
import { QuoteDefaultsForm } from './quote-defaults-form';
import { QuickQuoteTemplatesCard } from './quick-quote-templates-card';
import { SubscriptionCard } from './subscription-card';
import { WaitlistOfferCard } from './waitlist-offer-card';

export default async function ProDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if (session.user.role === 'ADMIN') redirect('/admin');
  if (session.user.role !== 'PRO') redirect('/dashboard/customer');

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  const proProfile = await prisma.proProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      categories: true,
      quotes: { include: { request: true } },
      quickQuoteTemplates: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!proProfile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Set up your pro profile</h1>
        <p className="mb-6 text-gray-600">
          Complete your profile so customers can find and request quotes from you.
        </p>
        <Card>
          <CardContent>
            <ProProfileForm categories={categories} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Computed before the verified check — a pro can be offered a waitlist
  // spot (or be waiting on one) while still pending admin review, and the
  // claim window doesn't pause for that review, so they need to be able to
  // see and act on it from this page either way.
  const myWaitlistEntries = await prisma.categoryWaitlistEntry.findMany({
    where: { proProfileId: proProfile.id, status: { in: ['WAITING', 'OFFERED'] } },
    include: { category: true },
  });
  const offeredEntries = myWaitlistEntries
    .filter((e) => e.status === 'OFFERED' && e.offerExpiresAt)
    .map((e) => ({
      id: e.id,
      categoryName: e.category.name,
      city: e.city,
      state: e.state,
      offerExpiresAt: e.offerExpiresAt!.toISOString(),
    }));

  if (!proProfile.verified) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <WaitlistOfferCard offers={offeredEntries} />
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{proProfile.businessName}</h1>
          </div>
          <Link href={`/pros/${proProfile.id}`} className="text-sm font-medium text-brand-600 hover:underline">
            View public profile
          </Link>
        </div>
        <Card>
          <CardContent>
            <h2 className="mb-2 text-lg font-bold text-gray-900">Your profile is awaiting verification</h2>
            <p className="text-gray-600">
              Thanks for signing up. Our team reviews every new pro profile before it goes live — once you're
              verified, you'll get an email and can subscribe to start seeing job leads in your area. This usually
              takes a day or two.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unreadNotifications = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  const [recentMessages, unreadMessageCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id, type: 'NEW_MESSAGE' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, type: 'NEW_MESSAGE', read: false },
    }),
  ]);

  // Backfill for any profile saved before serviceCity/serviceState existed.
  let serviceCity = proProfile.serviceCity;
  let serviceState = proProfile.serviceState;
  if (!serviceCity || !serviceState) {
    const location = deriveServiceLocation(proProfile.serviceZip);
    if (location) {
      serviceCity = location.city;
      serviceState = location.state;
      await prisma.proProfile.update({ where: { id: proProfile.id }, data: { serviceCity, serviceState } });
    }
  }

  const fullCategoryIds = serviceCity && serviceState ? await getFullCategoryIds(serviceCity, serviceState) : new Set<string>();

  const categoryIds = proProfile.categories.map((c) => c.categoryId);
  const candidateLeads = await prisma.serviceRequest.findMany({
    where: {
      categoryId: { in: categoryIds },
      status: { in: ['OPEN', 'QUOTED'] },
    },
    include: { category: true, property: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Keep leads within the pro's service radius; if a zip can't be matched
  // (bad data), don't hide it — just leave distance unknown. Order stays as
  // the query returned it (newest first) — sorting by distance here used to
  // let 20+ closer-but-older leads bury a brand-new batch entirely, which is
  // exactly the bug that prompted this comment.
  const leads = candidateLeads
    .map((r) => ({ request: r, distance: zipDistanceMiles(proProfile.serviceZip, r.property.zip) }))
    .filter(({ distance }) => distance === null || distance <= proProfile.serviceRadiusMiles);

  // Several leads from the same repair-document upload (or just the same
  // property) belong together so a pro can size up one job opportunity at
  // a glance instead of scanning a long flat list. Order follows `leads`
  // (newest first), so the most recently active property leads.
  const leadGroups: {
    propertyId: string;
    property: { addressLine1: string; city: string; state: string; zip: string };
    distance: number | null;
    items: typeof leads;
  }[] = [];
  const groupByPropertyId = new Map<string, (typeof leadGroups)[number]>();
  for (const lead of leads) {
    const { request: r, distance } = lead;
    let group = groupByPropertyId.get(r.propertyId);
    if (!group) {
      group = { propertyId: r.propertyId, property: r.property, distance, items: [] };
      groupByPropertyId.set(r.propertyId, group);
      leadGroups.push(group);
    }
    group.items.push(lead);
  }

  const quoteByRequestId = new Map(proProfile.quotes.map((q) => [q.requestId, q]));

  // "Jobs to bid on" — leads this pro hasn't quoted yet. Already-quoted ones
  // move to "Your open bids" below instead, so nothing is shown twice.
  const newLeads = leads.filter(({ request: r }) => !quoteByRequestId.has(r.id));

  // Pulled from proProfile.quotes directly (not the distance/category-
  // limited `leads` list above) so a bid still awaiting a decision never
  // drops off this list just because newer, closer leads pushed it out of
  // the capped leads query.
  const myOpenQuotes = proProfile.quotes
    .filter((q) => q.status === 'PENDING' && (!q.quoteFeeRequiredCents || q.quoteFeePaidAt))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Suspense fallback={null}>
        <PaymentStatusBanner />
      </Suspense>
      <WaitlistOfferCard offers={offeredEntries} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {proProfile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proProfile.photoUrl}
              alt=""
              className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gray-950 text-lg font-bold text-brand-400">
              {proProfile.businessName.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{proProfile.businessName}</h1>
            <p className="text-sm text-gray-500">
              {proProfile.avgRating.toFixed(1)} ★ ({proProfile.reviewCount} reviews)
              {proProfile.licenseNumber && <> · License #{proProfile.licenseNumber}</>}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-4">
          <Link href="/notifications" className="text-sm font-medium text-brand-600 hover:underline">
            Notifications
            {unreadNotifications > 0 && (
              <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-gray-950">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
          <Link href="/dashboard/pro/history" className="text-sm font-medium text-brand-600 hover:underline">
            Job history
          </Link>
          <Link href="/dashboard/pro/receipts" className="text-sm font-medium text-brand-600 hover:underline">
            Receipts
          </Link>
          <Link href={`/pros/${proProfile.id}`} className="text-sm font-medium text-brand-600 hover:underline">
            View public profile
          </Link>
        </div>
      </div>

      <AtAGlance
        newLeads={newLeads.slice(0, 4).map(({ request: r, distance }) => ({
          id: r.id,
          title: r.title,
          categoryName: r.category.name,
          distance,
        }))}
        newLeadsCount={newLeads.length}
        openQuotes={myOpenQuotes.slice(0, 4).map((q) => ({
          id: q.id,
          requestId: q.requestId,
          requestTitle: q.request.title,
          priceCents: q.priceCents,
          isEstimate: q.isEstimate,
          createdAt: q.createdAt,
        }))}
        openQuotesCount={myOpenQuotes.length}
        messages={recentMessages.map((n) => ({ id: n.id, title: n.title, url: n.url, read: n.read, createdAt: n.createdAt }))}
        unreadMessageCount={unreadMessageCount}
      />

      <div className="mb-4">
        <EditProfileToggle
          categories={categories}
          fullCategoryIds={[...fullCategoryIds]}
          waitlistedCategoryIds={myWaitlistEntries.filter((e) => e.status === 'WAITING').map((e) => e.categoryId)}
          initialValues={{
            businessName: proProfile.businessName,
            bio: proProfile.bio,
            yearsExperience: proProfile.yearsExperience,
            hourlyRateCents: proProfile.hourlyRateCents,
            serviceZip: proProfile.serviceZip,
            serviceRadiusMiles: proProfile.serviceRadiusMiles,
            categoryIds,
            photoUrl: proProfile.photoUrl,
            licenseNumber: proProfile.licenseNumber,
            isLicensed: proProfile.isLicensed,
            isInsured: proProfile.isInsured,
            licenseDocumentUrls: proProfile.licenseDocumentUrls,
            portfolioUrls: proProfile.portfolioUrls,
          }}
        />
      </div>

      <SubscriptionCard
        billingMode={proProfile.billingMode}
        status={proProfile.subscriptionStatus}
        currentPeriodEnd={
          proProfile.subscriptionCurrentPeriodEnd ? proProfile.subscriptionCurrentPeriodEnd.toLocaleDateString() : null
        }
        subscriptionPriceDollars={SUBSCRIPTION_PRICE_CENTS / 100}
        quotePriceDollars={QUOTE_PRICE_CENTS / 100}
      />

      <ConnectVerificationCard
        detailsSubmitted={proProfile.stripeConnectDetailsSubmitted}
        hasStartedOnboarding={!!proProfile.stripeConnectAccountId}
      />

      <QuoteDefaultsForm
        initialMessage={proProfile.defaultQuoteMessage}
        initialDurationDays={proProfile.defaultDurationDays}
      />

      <QuickQuoteTemplatesCard templates={proProfile.quickQuoteTemplates} />

      {myOpenQuotes.length > 0 && (
        <>
          <h2 id="open-bids" className="mb-4 scroll-mt-20 text-lg font-bold text-gray-900">
            Your open bids
          </h2>
          <div className="mb-8 flex flex-col gap-2">
            {myOpenQuotes.map((q) => (
              <Card key={q.id}>
                <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/requests/${q.requestId}`} className="min-w-0 flex-1 hover:underline">
                    <p className="font-semibold text-gray-900">{q.request.title}</p>
                    <p className="text-sm text-gray-500">
                      Submitted {formatDate(q.createdAt)} · Awaiting the customer&apos;s decision
                    </p>
                  </Link>
                  <span className="text-sm font-medium text-gray-700">
                    {q.isEstimate ? 'Est. ' : ''}
                    {formatCents(q.priceCents)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 id="job-leads" className="mb-4 scroll-mt-20 text-lg font-bold text-gray-900">
        Job leads within {proProfile.serviceRadiusMiles} miles of {proProfile.serviceZip}
      </h2>
      {leadGroups.length === 0 ? (
        <p className="mb-8 text-gray-500">No open leads in your service area right now — check back soon.</p>
      ) : (
        <div className="mb-8 flex flex-col gap-6">
          {leadGroups.map((group) => (
            <div key={group.propertyId}>
              <div className="mb-2 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="font-semibold text-gray-900">
                  {group.property.addressLine1}, {group.property.city}, {group.property.state} {group.property.zip}
                </h3>
                <span className="text-sm text-gray-500">
                  {group.items.length} item{group.items.length === 1 ? '' : 's'}
                  {group.distance !== null && ` · ${group.distance.toFixed(1)} mi away`}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {group.items.map(({ request: r, distance }) => (
                  <LeadCard
                    key={r.id}
                    request={r}
                    distance={distance}
                    hideLocation
                    myQuote={quoteByRequestId.get(r.id)}
                    quotePriceDollars={QUOTE_PRICE_CENTS / 100}
                    defaultMessage={proProfile.defaultQuoteMessage}
                    defaultDurationDays={proProfile.defaultDurationDays}
                    templates={proProfile.quickQuoteTemplates}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
