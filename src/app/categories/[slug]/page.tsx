import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { ProCard } from '@/components/pro-card';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { isValidZip, zipDistanceMiles } from '@/lib/zip';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};
  return {
    title: category.name,
    description: `Find verified local ${category.name.toLowerCase()} pros on Repair Bee. ${category.description}`,
  };
}

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest rated' },
  { value: 'experience', label: 'Most experienced' },
  { value: 'distance', label: 'Nearest' },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ zip?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const { zip, sort: sortParam } = await searchParams;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const proCategories = await prisma.proProfileCategory.findMany({
    where: { categoryId: category.id },
    include: { proProfile: true },
  });

  const allPros = proCategories.map((pc) => pc.proProfile);
  const distanceByProId = new Map<string, number>();

  let candidates = allPros;
  let zipNotice: string | null = null;
  let hasDistances = false;

  if (zip) {
    if (!isValidZip(zip)) {
      zipNotice = `We don't recognize the zip code "${zip}" — showing all pros in this category.`;
    } else {
      const withDistance = allPros
        .map((pro) => ({ pro, distance: zipDistanceMiles(zip, pro.serviceZip) }))
        .filter((p): p is { pro: (typeof allPros)[number]; distance: number } => p.distance !== null);

      const nearby = withDistance.filter(({ distance, pro }) => distance <= pro.serviceRadiusMiles);

      if (nearby.length > 0) {
        candidates = nearby.map(({ pro, distance }) => {
          distanceByProId.set(pro.id, distance);
          return pro;
        });
        hasDistances = true;
        zipNotice = `Showing pros who service ${zip}.`;
      } else {
        zipNotice = `No pros currently service ${zip} for this category — showing all pros instead.`;
      }
    }
  }

  const sort: SortValue =
    sortParam === 'experience' || sortParam === 'rating' || (sortParam === 'distance' && hasDistances)
      ? sortParam
      : hasDistances
        ? 'distance'
        : 'rating';

  const pros = [...candidates].sort((a, b) => {
    if (sort === 'distance') return (distanceByProId.get(a.id) ?? Infinity) - (distanceByProId.get(b.id) ?? Infinity);
    if (sort === 'experience') return b.yearsExperience - a.yearsExperience;
    return b.avgRating - a.avgRating;
  });

  function sortHref(value: SortValue) {
    const qs = new URLSearchParams();
    if (zip) qs.set('zip', zip);
    qs.set('sort', value);
    return `?${qs.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {category.icon} {category.name}
          </h1>
          <p className="mt-1 text-gray-600">{category.description}</p>
        </div>
        <Link href={`/request/new?category=${category.slug}`}>
          <Button size="lg" className="w-fit">
            Post a job in this category
          </Button>
        </Link>
      </div>

      {zipNotice && (
        <p className="mb-4 inline-flex rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">{zipNotice}</p>
      )}

      {pros.length > 0 && (
        <div className="mb-6 flex items-center gap-2 text-sm">
          <span className="text-gray-500">Sort:</span>
          {SORT_OPTIONS.filter((o) => o.value !== 'distance' || hasDistances).map((o) => (
            <Link
              key={o.value}
              href={sortHref(o.value)}
              className={`rounded-full border px-3 py-1 ${
                sort === o.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>
      )}

      {pros.length === 0 ? (
        <p className="text-gray-500">No pros listed for this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {pros.map((pro) => (
            <ProCard key={pro.id} pro={pro} distanceMiles={distanceByProId.get(pro.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
