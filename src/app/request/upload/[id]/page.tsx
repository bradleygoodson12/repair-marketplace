import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';

import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
          <CardContent>
            <h1 className="mb-2 text-xl font-bold text-gray-900">Analysis failed</h1>
            <p className="text-gray-600">{document.errorMessage ?? 'Something went wrong reading that document.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (document.status === 'PROCESSING') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardContent>
            <p className="text-gray-600">Still analyzing — refresh this page in a moment.</p>
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
      <ReviewForm document={document} categories={categories} />
    </div>
  );
}
