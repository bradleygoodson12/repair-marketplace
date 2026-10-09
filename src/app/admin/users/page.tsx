import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

import { SuspendButton } from './suspend-button';

export default async function AdminUsersPage() {
  const session = await getAdminSession();
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-gray-900">Users ({users.length})</h2>
      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{u.name}</span>
                  <Badge status={u.role} />
                  {u.suspended && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Suspended
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {u.email} · joined {formatDate(u.createdAt)}
                </p>
              </div>
              {u.id !== session?.user.id && <SuspendButton userId={u.id} suspended={u.suspended} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
