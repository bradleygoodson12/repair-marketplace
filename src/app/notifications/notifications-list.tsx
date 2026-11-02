'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationsList({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);

  async function handleClick(n: NotificationItem) {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      });
    }
    if (n.url) router.push(n.url);
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-400">Nothing here yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((n) => (
        <button key={n.id} type="button" onClick={() => handleClick(n)} className="block w-full text-left">
          <Card className={n.read ? '' : 'border-brand-200 bg-brand-50/40'}>
            <CardContent className="flex items-start gap-3 py-3">
              {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />}
              <div className={n.read ? 'pl-5' : ''}>
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-gray-500">{n.body}</p>}
                <p className="mt-1 text-xs text-gray-400">{formatDate(n.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
