import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

interface CategoryLite {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export function CategoryGrid({
  categories,
  zip,
}: {
  categories: CategoryLite[];
  zip?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={zip ? `/categories/${c.slug}?zip=${encodeURIComponent(zip)}` : `/categories/${c.slug}`}
        >
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
            <CardContent className="flex flex-col gap-2">
              <span className="text-3xl">{c.icon}</span>
              <span className="font-semibold text-gray-900">{c.name}</span>
              <span className="text-sm text-gray-500">{c.description}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
