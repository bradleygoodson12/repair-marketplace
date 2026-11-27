import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';

export default async function InspectorLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inspector = await prisma.inspectorPartner.findUnique({ where: { slug, active: true } });
  if (!inspector) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        {inspector.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={inspector.logoUrl}
            alt={inspector.companyName}
            className="h-12 w-12 rounded-full border border-gray-200 object-contain"
          />
        )}
        <p className="text-sm font-medium text-gray-500">Brought to you by {inspector.companyName}</p>
      </div>

      <h1 className="mb-3 text-2xl font-bold text-gray-900">Already have your inspection report?</h1>
      <p className="mb-6 text-gray-600">
        Upload it and we&apos;ll pull out every repair item, match each one to the right type of local pro, and get
        you free quotes — no obligation, and no need to re-type anything from the report by hand.
      </p>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3">
          <p className="font-semibold text-gray-900">How it works</p>
          <ul className="flex flex-col gap-2 text-sm text-gray-600">
            <li>1. Upload the inspection report {inspector.companyName} sent you.</li>
            <li>2. We read it and sort every repair into the right trade category.</li>
            <li>3. Review the list, then send it to vetted pros near the property — all at once.</li>
          </ul>
        </CardContent>
      </Card>

      <Link href={`/request/upload?ref=${encodeURIComponent(inspector.slug)}`}>
        <Button size="lg">Upload my inspection report</Button>
      </Link>
    </div>
  );
}
