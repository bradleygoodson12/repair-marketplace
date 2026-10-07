import { notFound } from 'next/navigation';
import Link from 'next/link';

import { ProCard } from '@/components/pro-card';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { isValidZip, zipDistanceMiles } from '@/lib/zip';

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ zip?: string }>;
}) {
  const { slug } = await params;
  const { zip } = await searchParams;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const proCategories = await prisma.proProfileCategory.findMany({
    where: { categoryId: category.id },
    include: { proProfile: true },
  });

  const allPros = proCategories.map((pc) => pc.proProfile);

  let pros = allPros;
  let zipNotice: string | null = null;

  if (zip) {
    if (!isValidZip(zip)) {
      zipNotice = `We don't recognize the zip code "${zip}" — showing all pros in this category.`;
      pros = [...allPros].sort((a, b) => b.avgRating - a.avgRating);
    } else {
      const withDistance = allPros
        .map((pro) => ({ pro, distance: zipDistanceMiles(zip, pro.serviceZip) }))
        .filter((p): p is { pro: (typeof allPros)[number]; distance: number } => p.distance !== null);

      const nearby = withDistance
        .filter(({ distance, pro }) => distance <= pro.serviceRadiusMiles)
        .sort((a, b) => a.distance - b.distance);

      if (nearby.length > 0) {
        pros = nearby.map(({ pro }) => pro);
        zipNotice = `Showing pros who service ${zip}, nearest first.`;
      } else {
        zipNotice = `No pros currently service ${zip} for this category — showing all pros instead.`;
        pros = [...allPros].sort((a, b) => b.avgRating - a.avgRating);
      }
    }
  } else {
    pros = [...allPros].sort((a, b) => b.avgRating - a.avgRating);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {category.icon} {category.name}
          </h1>
          <p className="mt-1 text-gray-600">{category.description}</p>
        </div>
        <Link href={`/request/new?category=${category.slug}`}>
          <Button size="lg">Post a job in this category</Button>
        </Link>
      </div>

      {zipNotice && <p className="mb-4 text-sm text-gray-500">{zipNotice}</p>}

      {pros.length === 0 ? (
        <p className="text-gray-500">No pros listed for this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {pros.map((pro) => (
            <ProCard key={pro.id} pro={pro} />
          ))}
        </div>
      )}
    </div>
  );
}
