import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ProSignupLandingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-4 text-3xl font-bold text-gray-900">Grow your repair business with FixItPro</h1>
      <p className="mb-8 text-gray-600">
        Get matched with local homeowners who need your services, send quotes, and get paid securely —
        no cold leads, no monthly fees to start.
      </p>
      <Card className="mb-8 text-left">
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {[
            { title: 'Get matched', body: 'See job requests that match your service categories and area.' },
            { title: 'Send quotes', body: 'Message customers and send a price & timeline.' },
            { title: 'Get paid', body: 'Customers pay securely through FixItPro once you\'re booked.' },
          ].map((s) => (
            <div key={s.title}>
              <h3 className="mb-1 font-semibold text-gray-900">{s.title}</h3>
              <p className="text-sm text-gray-600">{s.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Link href="/signup">
        <Button size="lg">Sign up as a pro</Button>
      </Link>
    </div>
  );
}
