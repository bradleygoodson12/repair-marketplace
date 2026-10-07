import { CategoryGrid } from '@/components/category-grid';
import { prisma } from '@/lib/prisma';

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string }>;
}) {
  const { zip } = await searchParams;
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">All services</h1>
      {zip && (
        <p className="mb-6 text-sm text-gray-500">
          Pick a category to see pros near {zip}.
        </p>
      )}
      <CategoryGrid categories={categories} zip={zip} />
    </div>
  );
}
