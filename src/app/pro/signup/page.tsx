import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QUOTE_PRICE_CENTS, SUBSCRIPTION_PRICE_CENTS } from '@/lib/pricing';

const steps = [
  { title: 'Get matched', body: 'See job requests that match your service categories and area.' },
  { title: 'Send quotes', body: 'Message customers and send a price & timeline.' },
  { title: 'Get paid directly', body: "Customers pay you directly — no commissions on the job itself." },
];

export default function ProSignupLandingPage() {
  const quotePriceDollars = QUOTE_PRICE_CENTS / 100;
  const subscriptionPriceDollars = SUBSCRIPTION_PRICE_CENTS / 100;

  return (
    <div>
      <section className="bg-gray-950">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Grow your repair business with <span className="text-brand-400">Repair Bee</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Get matched with local homeowners who need your services, send quotes, and get paid directly — no
            commissions, ever.
          </p>
          <Link href="/signup">
            <Button size="lg" className="mt-8">
              Sign up as a pro
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={s.title}>
              <CardContent className="p-6">
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-950 text-sm font-bold text-brand-400">
                  {i + 1}
                </span>
                <h3 className="mb-1.5 font-semibold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-brand-200 bg-brand-50">
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <h3 className="font-bold text-gray-900">${quotePriceDollars} per quote — pay only when you bid</h3>
            <p className="max-w-md text-sm text-gray-600">
              Every job lead in your area is free to browse. You're only charged the ${quotePriceDollars} fee the
              moment you actually send a quote — nothing up front, no cost for leads you skip.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Bidding on a lot of jobs? Switch to ${subscriptionPriceDollars}/month for unlimited quotes any time —
              no per-quote fees.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
