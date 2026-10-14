'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { PhotoUploader } from '@/components/photo-uploader';

interface CategoryOption {
  id: string;
  name: string;
}

interface ProfileValues {
  businessName: string;
  bio: string;
  yearsExperience: number;
  hourlyRateCents: number | null;
  serviceZip: string;
  serviceRadiusMiles: number;
  categoryIds: string[];
  photoUrl: string | null;
  licenseNumber: string | null;
  portfolioUrls: string[];
}

export function ProProfileForm({
  categories,
  initialValues,
  onSaved,
}: {
  categories: CategoryOption[];
  initialValues?: ProfileValues;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(initialValues?.businessName ?? '');
  const [bio, setBio] = useState(initialValues?.bio ?? '');
  const [yearsExperience, setYearsExperience] = useState(initialValues?.yearsExperience.toString() ?? '');
  const [hourlyRate, setHourlyRate] = useState(
    initialValues?.hourlyRateCents ? (initialValues.hourlyRateCents / 100).toString() : '',
  );
  const [serviceZip, setServiceZip] = useState(initialValues?.serviceZip ?? '');
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState(initialValues?.serviceRadiusMiles.toString() ?? '15');
  const [categoryIds, setCategoryIds] = useState<string[]>(initialValues?.categoryIds ?? []);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialValues?.photoUrl ? [initialValues.photoUrl] : []);
  const [licenseNumber, setLicenseNumber] = useState(initialValues?.licenseNumber ?? '');
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(initialValues?.portfolioUrls ?? []);
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
        photoUrl: photoUrls[0] ?? null,
        licenseNumber: licenseNumber.trim() || null,
        portfolioUrls,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not save profile.');
      return;
    }

    router.refresh();
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Business photo (optional)</label>
        <PhotoUploader value={photoUrls} onChange={setPhotoUrls} max={1} />
      </div>
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
        <label className="mb-1 block text-sm font-medium text-gray-700">License number (optional)</label>
        <Input
          placeholder="e.g. SC-HVAC-10234"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Portfolio photos (optional)</label>
        <p className="mb-2 text-xs text-gray-500">Show customers examples of your past work.</p>
        <PhotoUploader value={portfolioUrls} onChange={setPortfolioUrls} max={12} />
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
        {loading ? 'Saving…' : initialValues ? 'Save changes' : 'Save profile'}
      </Button>
    </form>
  );
}
