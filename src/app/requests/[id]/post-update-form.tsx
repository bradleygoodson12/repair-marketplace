'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { MultiFileUploader } from '@/components/multi-file-uploader';
import { Button } from '@/components/ui/button';

export function PostUpdateForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/bookings/${bookingId}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, photoUrls }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not post update.');
      return;
    }
    setNote('');
    setPhotoUrls([]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-gray-100 p-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What's the latest? e.g. materials ordered, demo done, back tomorrow to finish..."
        rows={2}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        required
      />
      <MultiFileUploader value={photoUrls} onChange={setPhotoUrls} max={50} preferCamera />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="sm" className="self-start" disabled={submitting}>
        {submitting ? 'Posting…' : 'Post update'}
      </Button>
    </form>
  );
}
