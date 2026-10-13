'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/input';

const REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'FRAUD', label: 'Fraud or scam' },
  { value: 'OTHER', label: 'Other' },
] as const;

export function ReportButton({
  targetUserId,
  targetRequestId,
  label = 'Report',
}: {
  targetUserId?: string;
  targetRequestId?: string;
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('SPAM');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (submitted) {
    return <p className="text-xs text-gray-400">Thanks — our team will take a look.</p>;
  }

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className="text-xs text-gray-400 hover:text-red-600">
        {label}
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, targetRequestId, reason, details: details.trim() || undefined }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not submit report.');
      return;
    }

    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
      <Select value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number]['value'])}>
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </Select>
      <Textarea
        rows={2}
        placeholder="Details (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit report'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
