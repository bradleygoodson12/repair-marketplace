import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const homeownerSteps = [
  'Post a repair job with a description, photos, and your address.',
  'Verified local pros send you quotes with pricing and timelines.',
  'Compare quotes, message pros with questions, and accept the one you like.',
  'Schedule the work and pay your pro directly — Repair Bee never touches that payment.',
  'Leave a review after the job is done to help other homeowners.',
];

const proSteps = [
  'Create a pro profile and pick the categories you service.',
  'Subscribe to unlock job leads from homeowners near you in real time.',
  'Send quotes and message customers directly on the platform.',
  'Get booked and paid directly by the customer — no commissions, no chasing invoices.',
];

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-5">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-4">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-950 text-sm font-bold text-brand-400">
            {i + 1}
          </span>
          <p className="pt-1 text-gray-700">{step}</p>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorksPage() {
  return (
    <div>
      <section className="bg-gray-950">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">How Repair Bee works</h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-400">
            A straightforward path for homeowners to get repairs done, and for pros to grow their business.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardContent className="p-8">
              <h2 className="mb-6 text-xl font-bold text-gray-900">For homeowners</h2>
              <StepList steps={homeownerSteps} />
              <Link href="/request/new">
                <Button className="mt-8 w-full">Post a job</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8">
              <h2 className="mb-6 text-xl font-bold text-gray-900">For repair pros</h2>
              <StepList steps={proSteps} />
              <Link href="/pro/signup">
                <Button variant="secondary" className="mt-8 w-full">
                  Become a pro
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
