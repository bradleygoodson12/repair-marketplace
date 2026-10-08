'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

interface MessageData {
  id: string;
  body: string;
  createdAt: string | Date;
  sender: { id: string; name: string };
}

export function MessageThread({ requestId, messages, currentUserId }: {
  requestId: string;
  messages: MessageData[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, body }),
    });

    setBody('');
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              m.sender.id === currentUserId
                ? 'ml-auto bg-gray-950 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            <div className="mb-0.5 text-xs opacity-70">
              {m.sender.name} · {formatDate(m.createdAt)}
            </div>
            {m.body}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          rows={2}
          placeholder="Send a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          Send
        </Button>
      </form>
    </div>
  );
}
