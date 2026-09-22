import { notFound } from 'next/navigation';
import Link from 'next/link';

import { ProCard } from '@/components/pro-card';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';

export default async function CategoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const proCategories = await prisma.proProfileCategory.findMany({
    where: { categoryId: category.id },
    include: { proProfile: true },
  });

  const pros = proCategories.map((pc) => pc.proProfile).sort((a, b) => b.avgRating - a.avgRating);

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
