'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { formatCents } from '@/lib/utils';

interface Template {
  id: string;
  label: string;
  priceCents: number;
  durationDays: number | null;
  message: string | null;
}

export function QuickQuoteTemplatesCard({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/pro-profile/quick-quote-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label,
        priceCents: Math.round(parseFloat(price) * 100),
        durationDays: duration ? parseInt(duration, 10) : null,
        message: message.trim() || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not save template.');
      return;
    }

    setLabel('');
    setPrice('');
    setDuration('');
    setMessage('');
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/pro-profile/quick-quote-templates/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <Card className="mb-8">
      <CardContent>
        <h2 className="mb-1 font-semibold text-gray-900">Quick-quote templates</h2>
        <p className="mb-3 text-sm text-gray-500">
          Named presets for jobs you quote often — picking one fills the quote form instantly, still editable before
          you send it.
        </p>

        {templates.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
              >
                <div>
                  <span className="font-medium text-gray-900">{t.label}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {formatCents(t.priceCents)}
                    {t.durationDays ? ` · ${t.durationDays}d` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                  className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
                >
                  {deletingId === t.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}

        {!adding ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            + Add template
          </Button>
        ) : (
          <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Label</label>
              <Input
                required
                placeholder="e.g. Faucet replacement"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Price ($)</label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Duration (days)</label>
                <Input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Message (optional)</label>
              <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Saving…' : 'Save template'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
