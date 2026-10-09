import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { ProcessingPoller } from './processing-poller';
import { ReviewForm } from './review-form';

export default async function ReviewRepairDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const document = await prisma.repairDocument.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { createdAt: 'asc' } } },
  });
  if (!document || document.customerId !== session.user.id) notFound();

  if (document.status === 'FAILED') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <h1 className="text-xl font-bold text-gray-900">Analysis failed</h1>
            <p className="text-gray-600">{document.errorMessage ?? 'Something went wrong reading that document.'}</p>
            <Link href="/request/upload">
              <Button variant="outline">Try again</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (document.status === 'PROCESSING') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <ProcessingPoller />
        <Card>
          <CardContent className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-gray-950"
            />
            <p className="text-gray-600">
              Analyzing <span className="font-medium">{document.originalFilename}</span> — this updates
              automatically, usually within a minute.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (document.status === 'SUBMITTED') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardContent>
            <h1 className="mb-2 text-xl font-bold text-gray-900">Already sent</h1>
            <p className="text-gray-600">These repair requests have already been sent to professionals.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Review extracted repairs</h1>
      <p className="mb-6 text-gray-600">
        From <span className="font-medium">{document.originalFilename}</span> — check the property
        address, uncheck anything you don't want sent, and adjust the category if needed.
      </p>
      <ReviewForm
        document={{
          id: document.id,
          fileUrl: document.fileUrl,
          originalFilename: document.originalFilename,
          supportingDocumentUrls: document.supportingDocumentUrls,
          extractedAddressLine1: document.extractedAddressLine1,
          extractedCity: document.extractedCity,
          extractedState: document.extractedState,
          extractedZip: document.extractedZip,
          lineItems: document.lineItems,
        }}
        categories={categories}
      />
    </div>
  );
}
