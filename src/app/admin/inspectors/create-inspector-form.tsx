'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CreateInspectorForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreatedSlug(null);

    const res = await fetch('/api/admin/inspectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, contactName, contactEmail, contactPhone }),
    });
    const data = res.ok ? await res.json() : await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not create that inspector.');
      return;
    }

    setCreatedSlug(data.slug);
    setCompanyName('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="font-semibold text-gray-900">Add an inspector partner</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          required
          placeholder="Company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <Input
          placeholder="Contact name (optional)"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <Input
          type="email"
          placeholder="Contact email (optional)"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <Input
          type="tel"
          placeholder="Contact phone (optional)"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={!companyName.trim() || loading}>
          {loading ? 'Creating…' : 'Create'}
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      {createdSlug && (
        <p className="text-xs text-green-700">
          Created — referral link: <span className="font-mono">/inspectors/{createdSlug}</span>
        </p>
      )}
    </form>
  );
}
