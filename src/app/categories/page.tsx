import { CategoryGrid } from '@/components/category-grid';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">All services</h1>
      <CategoryGrid categories={categories} />
    </div>
  );
}
