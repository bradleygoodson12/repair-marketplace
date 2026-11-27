import type { RequestStatus } from '@prisma/client';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';

import { CreateInspectorForm } from './create-inspector-form';

const CONVERTED_STATUSES: RequestStatus[] = ['BOOKED', 'IN_PROGRESS', 'COMPLETED'];

export default async function AdminInspectorsPage() {
  const inspectors = await prisma.inspectorPartner.findMany({ orderBy: { createdAt: 'desc' } });

  const stats = await Promise.all(
    inspectors.map(async (inspector) => {
      const [referred, converted] = await Promise.all([
        prisma.serviceRequest.count({ where: { referredByInspectorId: inspector.id } }),
        prisma.serviceRequest.count({
          where: { referredByInspectorId: inspector.id, status: { in: CONVERTED_STATUSES } },
        }),
      ]);
      return { id: inspector.id, referred, converted };
    }),
  );
  const statsById = new Map(stats.map((s) => [s.id, s]));

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-gray-900">Inspector partners ({inspectors.length})</h2>
      <Card className="mb-6">
        <CardContent>
          <CreateInspectorForm />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-2">
        {inspectors.map((inspector) => {
          const s = statsById.get(inspector.id);
          return (
            <Card key={inspector.id}>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{inspector.companyName}</p>
                    {!inspector.active && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {inspector.contactName && <>{inspector.contactName} · </>}
                    {inspector.contactEmail && (
                      <a href={`mailto:${inspector.contactEmail}`} className="hover:text-brand-700 hover:underline">
                        {inspector.contactEmail}
                      </a>
                    )}
                    {inspector.contactPhone && <> · {inspector.contactPhone}</>}
                  </p>
                  <Link
                    href={`/inspectors/${inspector.slug}`}
                    className="mt-1 inline-block font-mono text-xs text-brand-700 hover:underline"
                  >
                    /inspectors/{inspector.slug}
                  </Link>
                </div>
                <p className="flex-shrink-0 text-sm text-gray-600">
                  {s?.referred ?? 0} referred · {s?.converted ?? 0} booked
                </p>
              </CardContent>
            </Card>
          );
        })}
        {inspectors.length === 0 && <p className="text-sm text-gray-500">No inspector partners yet.</p>}
      </div>
    </div>
  );
}
