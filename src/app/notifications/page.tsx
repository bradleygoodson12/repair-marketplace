import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { NotificationsList } from './notifications-list';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const messages = notifications.filter((n) => n.type === 'NEW_MESSAGE');
  const activity = notifications.filter((n) => n.type !== 'NEW_MESSAGE');

  const activityLabel = session.user.role === 'PRO' ? 'Job & quote opportunities' : 'Updates';

  const serialize = (list: typeof notifications) =>
    list.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Notifications</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{activityLabel}</h2>
        <NotificationsList notifications={serialize(activity)} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Messages</h2>
        <NotificationsList notifications={serialize(messages)} />
      </section>
    </div>
  );
}
