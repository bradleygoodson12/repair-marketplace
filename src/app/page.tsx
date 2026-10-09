import { CategoryGrid } from '@/components/category-grid';
import { ZipSearchForm } from '@/components/zip-search-form';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

const trustPoints = ['Verified pro profiles', 'Free, no-obligation quotes', 'Message pros directly'];

const steps = [
  {
    title: 'Submit your repair list',
    body: 'Submit your repair request line items and choose the corresponding contractor type(s) for each one.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
      />
    ),
  },
  {
    title: 'Request estimates',
    body: 'Submit estimate requests to each contractor/trade — all in one go, with no repeat data entry.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"
      />
    ),
  },
  {
    title: 'Pick your pro',
    body: 'Receive estimates quickly for each repair item and choose the contractor you want to schedule.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    ),
  },
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
            Get fast quotes from top-rated, verified pros near your property, then book with confidence—all in one
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

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">How it works</h2>
          <div className="grid gap-10 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-950 text-brand-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                    {s.icon}
                  </svg>
                </span>
                <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Step {i + 1}
                </span>
                <h3 className="mb-1.5 font-semibold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Browse by service</h2>
          <CategoryGrid categories={categories} />
        </div>
      </section>
    </div>
  );
}
