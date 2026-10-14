'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

interface ReviewReplySectionProps {
  reviewId: string;
  businessName: string;
  proReply: string | null;
  proReplyAt: string | null;
  isOwner: boolean;
}

export function ReviewReplySection({ reviewId, businessName, proReply, proReplyAt, isOwner }: ReviewReplySectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState(proReply ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/reviews/${reviewId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not post reply.');
      return;
    }

    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        <Textarea
          rows={2}
          required
          placeholder="Reply to this review…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Posting…' : 'Post reply'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  if (proReply) {
    return (
      <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-medium text-gray-900">Response from {businessName}</span>
          {proReplyAt && <span className="text-xs text-gray-400">{formatDate(proReplyAt)}</span>}
        </div>
        <p className="text-gray-600">{proReply}</p>
        {isOwner && (
          <button type="button" onClick={() => setEditing(true)} className="mt-1 text-xs text-brand-600 hover:underline">
            Edit reply
          </button>
        )}
      </div>
    );
  }

  if (isOwner) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="mt-2 text-xs text-brand-600 hover:underline">
        Reply to this review
      </button>
    );
  }

  return null;
}
