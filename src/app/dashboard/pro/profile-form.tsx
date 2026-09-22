'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';

interface CategoryOption {
  id: string;
  name: string;
}

export function ProProfileForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [serviceZip, setServiceZip] = useState('');
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState('15');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/pro-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName,
        bio,
        yearsExperience: parseInt(yearsExperience || '0', 10),
        hourlyRateCents: hourlyRate ? Math.round(parseFloat(hourlyRate) * 100) : null,
        serviceZip,
        serviceRadiusMiles: parseInt(serviceRadiusMiles || '15', 10),
        categoryIds,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not save profile.');
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Business name</label>
        <Input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
        <Textarea required rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Years experience</label>
          <Input
            type="number"
            min="0"
            required
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Hourly rate ($)</label>
          <Input type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Service zip code</label>
          <Input required value={serviceZip} onChange={(e) => setServiceZip(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Service radius (miles)</label>
          <Input
            type="number"
            min="1"
            required
            value={serviceRadiusMiles}
            onChange={(e) => setServiceRadiusMiles(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Service categories</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className={`rounded-full border px-3 py-1 text-sm ${
                categoryIds.includes(c.id)
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
