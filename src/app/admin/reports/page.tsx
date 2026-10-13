import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

import { ReportActions } from './report-actions';

const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam',
  INAPPROPRIATE: 'Inappropriate content',
  FRAUD: 'Fraud or scam',
  OTHER: 'Other',
};

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    include: { reporter: true, targetUser: true, targetRequest: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  const openCount = reports.filter((r) => r.status === 'OPEN').length;

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        Reports ({openCount} open, {reports.length} total)
      </h2>
      {reports.length === 0 ? (
        <p className="text-gray-500">No reports filed yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((r) => (
            <Card key={r.id} className={r.status !== 'OPEN' ? 'opacity-60' : ''}>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {REASON_LABELS[r.reason] ?? r.reason}
                    </span>
                    <span className="text-xs text-gray-400">{r.status}</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {r.targetUser && (
                      <>
                        Reported user: <span className="font-medium">{r.targetUser.name}</span> ({r.targetUser.email}
                        )
                      </>
                    )}
                    {r.targetRequest && (
                      <>
                        Reported job:{' '}
                        <Link href={`/requests/${r.targetRequest.id}`} className="font-medium text-brand-600 hover:underline">
                          {r.targetRequest.title}
                        </Link>
                      </>
                    )}
                  </p>
                  {r.details && <p className="mt-1 text-sm text-gray-600">"{r.details}"</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    Filed by {r.reporter.name} ({r.reporter.email}) · {formatDate(r.createdAt)}
                  </p>
                </div>
                {r.status === 'OPEN' && <ReportActions reportId={r.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
