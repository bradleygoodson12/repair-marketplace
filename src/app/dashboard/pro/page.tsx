import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { SUBSCRIPTION_PRICE_CENTS } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { zipDistanceMiles } from '@/lib/zip';

import { EditProfileToggle } from './edit-profile-toggle';
import { LeadCard } from './lead-card';
import { ProProfileForm } from './profile-form';
import { QuoteDefaultsForm } from './quote-defaults-form';
import { QuickQuoteTemplatesCard } from './quick-quote-templates-card';
import { SubscriptionCard } from './subscription-card';

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

  if (!proProfile.verified) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
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
  // (bad data), don't hide it — just leave distance unknown.
  const leads = candidateLeads
    .map((r) => ({ request: r, distance: zipDistanceMiles(proProfile.serviceZip, r.property.zip) }))
    .filter(({ distance }) => distance === null || distance <= proProfile.serviceRadiusMiles)
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .slice(0, 20);

  const quotedRequestIds = new Set(proProfile.quotes.map((q) => q.requestId));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
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
        <div className="flex-shrink-0">
          <Link href={`/pros/${proProfile.id}`} className="text-sm font-medium text-brand-600 hover:underline">
            View public profile
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <EditProfileToggle
          categories={categories}
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
            portfolioUrls: proProfile.portfolioUrls,
          }}
        />
      </div>

      <SubscriptionCard
        status={proProfile.subscriptionStatus}
        currentPeriodEnd={
          proProfile.subscriptionCurrentPeriodEnd ? proProfile.subscriptionCurrentPeriodEnd.toLocaleDateString() : null
        }
        subscriptionPriceDollars={SUBSCRIPTION_PRICE_CENTS / 100}
      />

      <QuoteDefaultsForm
        initialMessage={proProfile.defaultQuoteMessage}
        initialDurationDays={proProfile.defaultDurationDays}
      />

      <QuickQuoteTemplatesCard templates={proProfile.quickQuoteTemplates} />

      <h2 className="mb-4 text-lg font-bold text-gray-900">
        Job leads within {proProfile.serviceRadiusMiles} miles of {proProfile.serviceZip}
      </h2>
      {proProfile.subscriptionStatus !== 'ACTIVE' ? (
        <p className="mb-8 text-gray-500">Subscribe above to see and quote job leads in your area.</p>
      ) : leads.length === 0 ? (
        <p className="mb-8 text-gray-500">No open leads in your service area right now — check back soon.</p>
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {leads.map(({ request: r, distance }) => (
            <LeadCard
              key={r.id}
              request={r}
              distance={distance}
              alreadyQuoted={quotedRequestIds.has(r.id)}
              defaultMessage={proProfile.defaultQuoteMessage}
              defaultDurationDays={proProfile.defaultDurationDays}
              templates={proProfile.quickQuoteTemplates}
            />
          ))}
        </div>
      )}
    </div>
  );
}
