import { Card, CardContent } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';

import { ResolveErrorButton } from './resolve-error-button';

export default async function AdminErrorsPage() {
  const errors = await prisma.errorLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  const unresolvedCount = errors.filter((e) => !e.resolvedAt).length;

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        Errors ({unresolvedCount} unresolved, {errors.length} shown)
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Caught automatically from any uncaught server error, plus a few spots (like PDF analysis) that are worth
        surfacing even though they're handled gracefully for the user. An admin email/notification goes out at most
        once every 15 minutes per source, so a repeating error won't spam you — but every occurrence still shows up
        here.
      </p>
      <div className="flex flex-col gap-2">
        {errors.map((e) => (
          <Card key={e.id} className={e.resolvedAt ? 'opacity-60' : undefined}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-semibold text-gray-900">{e.source}</p>
                  <p className="text-xs text-gray-400">{e.createdAt.toLocaleString('en-US')}</p>
                </div>
                {e.resolvedAt ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    Resolved
                  </span>
                ) : (
                  <ResolveErrorButton errorId={e.id} />
                )}
              </div>
              <p className="text-sm text-gray-800">{e.message}</p>
              {e.context !== null && (
                <pre className="overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-500">
                  {JSON.stringify(e.context, null, 2)}
                </pre>
              )}
              {e.stack && (
                <details>
                  <summary className="cursor-pointer text-xs text-gray-400">Stack trace</summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-500">{e.stack}</pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
        {errors.length === 0 && <p className="text-sm text-gray-500">No errors logged yet.</p>}
      </div>
    </div>
  );
}
