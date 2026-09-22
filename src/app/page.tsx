import { CategoryGrid } from '@/components/category-grid';
import { ZipSearchForm } from '@/components/zip-search-form';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

export default async function HomePage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Home repairs, handled by trusted local pros
          </h1>
          <p className="max-w-2xl text-lg text-gray-600">
            Tell us what's broken, get quotes from vetted repair pros near you, and book with
            confidence — all in one place.
          </p>
          <ZipSearchForm />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Browse by service</h2>
        <CategoryGrid categories={categories} />
      </section>

      <section className="border-t border-gray-200 bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3">
          {[
            { title: '1. Post your job', body: 'Describe the repair, add photos, and tell us your budget.' },
            { title: '2. Compare quotes', body: 'Vetted local pros send you quotes and estimated timelines.' },
            { title: '3. Book & pay securely', body: 'Choose a pro, schedule the work, and pay through FixItPro.' },
          ].map((s) => (
            <div key={s.title}>
              <h3 className="mb-2 font-semibold text-gray-900">{s.title}</h3>
              <p className="text-sm text-gray-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
