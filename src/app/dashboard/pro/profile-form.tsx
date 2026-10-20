'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { PhotoUploader } from '@/components/photo-uploader';
import { MultiFileUploader } from '@/components/multi-file-uploader';

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
  isLicensed: boolean;
  isInsured: boolean;
  licenseDocumentUrls: string[];
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
  const [isLicensed, setIsLicensed] = useState(initialValues?.isLicensed ?? false);
  const [isInsured, setIsInsured] = useState(initialValues?.isInsured ?? false);
  const [licenseDocumentUrls, setLicenseDocumentUrls] = useState<string[]>(initialValues?.licenseDocumentUrls ?? []);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(initialValues?.portfolioUrls ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (categoryIds.length === 0) {
      setError('Select at least one service category — pick every category you can legally and safely perform.');
      return;
    }

    setLoading(true);

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
        isLicensed,
        isInsured,
        licenseDocumentUrls,
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
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Service categories</label>
          <span className="text-xs font-medium text-gray-500">{categoryIds.length} selected</span>
        </div>
        <p className="mb-2 text-xs text-gray-500">
          Select every category you're qualified and legally able to perform — not just your main trade. Leads are
          matched by category, so a fuller list means more matching leads. Only select a category if you can legally
          and safely do that work in your state (some, like electrical or HVAC, typically require a license — check
          your own state's rules).
        </p>
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
      <div className="rounded-lg border border-gray-200 p-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">License &amp; insurance</label>
        <p className="mb-3 text-xs text-gray-500">
          Many trades (plumbing, electrical, HVAC, etc.) require a state license — requirements vary by state, so
          check your own state's rules. These are self-reported and shown on your public profile; Repair Bee
          doesn't verify them.
        </p>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isLicensed}
              onChange={(e) => setIsLicensed(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            I am licensed for the trades I offer
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isInsured}
              onChange={(e) => setIsInsured(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            I carry general liability insurance
          </label>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">License number (optional)</label>
          <Input
            placeholder="e.g. SC-HVAC-10234"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">Supporting documents (optional)</label>
          <p className="mb-2 text-xs text-gray-500">
            License copy, certificate of insurance, etc. — for our team to spot-check, never shown publicly.
          </p>
          <MultiFileUploader value={licenseDocumentUrls} onChange={setLicenseDocumentUrls} max={5} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Portfolio photos (optional)</label>
        <p className="mb-2 text-xs text-gray-500">Show customers examples of your past work.</p>
        <PhotoUploader value={portfolioUrls} onChange={setPortfolioUrls} max={12} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving…' : initialValues ? 'Save changes' : 'Save profile'}
      </Button>
    </form>
  );
}
