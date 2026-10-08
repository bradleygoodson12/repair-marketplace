import { CategoryGrid } from '@/components/category-grid';
import { ZipSearchForm } from '@/components/zip-search-form';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

const trustPoints = ['Vetted & background-checked pros', 'Free, no-obligation quotes', 'Message pros directly'];

const steps = [
  { title: 'Post your job', body: 'Describe the repair, add photos, and tell us your budget.' },
  { title: 'Compare quotes', body: 'Vetted local pros send you quotes and estimated timelines.' },
  { title: 'Book with confidence', body: 'Choose a pro, schedule the work, and pay them directly.' },
];

export default async function HomePage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div>
      <section className="relative overflow-hidden bg-gray-950">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-400 to-brand-600"
        />
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Home repairs, handled by <span className="text-brand-400">trusted local pros</span>
          </h1>
          <p className="max-w-2xl text-lg text-gray-400">
            <span className="block font-semibold text-white">Need a repair? We make it painless.</span>
            Get fast quotes from top-rated, vetted pros near your property, then book with confidence—all in one
            simple platform.
          </p>
          <ZipSearchForm />
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
            {trustPoints.map((point) => (
              <span key={point} className="flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-brand-400">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                {point}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Browse by service</h2>
        <CategoryGrid categories={categories} />
      </section>

      <section className="border-t border-gray-200 bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-950 text-sm font-bold text-brand-400">
                  {i + 1}
                </span>
                <h3 className="mb-1.5 font-semibold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
