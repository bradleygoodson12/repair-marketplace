'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { PhotoUploader } from '@/components/photo-uploader';

interface CategoryOption {
  id: string;
  slug: string;
  name: string;
}

interface SavedProperty {
  id: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
}

export function RequestForm({
  categories,
  savedProperties = [],
}: {
  categories: CategoryOption[];
  savedProperties?: SavedProperty[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultSlug = searchParams.get('category');
  const defaultCategoryId = categories.find((c) => c.slug === defaultSlug)?.id ?? categories[0]?.id ?? '';

  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  async function handleSuggestCategory() {
    if (!title.trim() && !description.trim()) {
      setSuggestError('Add a title or description first so there is something to go on.');
      return;
    }
    setSuggesting(true);
    setSuggestError(null);

    const res = await fetch('/api/categories/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });

    setSuggesting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSuggestError(typeof data.error === 'string' ? data.error : 'Could not suggest a category.');
      return;
    }

    const data = await res.json();
    setCategoryId(data.categoryId);
  }

  function fillAddress(p: SavedProperty) {
    setAddressLine1(p.addressLine1);
    setCity(p.city);
    setState(p.state);
    setZip(p.zip);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId,
        title,
        description,
        budgetMinCents: budgetMin ? Math.round(parseFloat(budgetMin) * 100) : null,
        budgetMaxCents: budgetMax ? Math.round(parseFloat(budgetMax) * 100) : null,
        preferredDate: preferredDate || null,
        photoUrls,
        property: { addressLine1, city, state, zip },
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not submit your request.');
      return;
    }

    const data = await res.json();
    router.push(`/requests/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Service category</label>
          <button
            type="button"
            onClick={handleSuggestCategory}
            disabled={suggesting}
            className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            {suggesting ? 'Thinking…' : "Not sure? Suggest one from my description"}
          </button>
        </div>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {suggestError && <p className="mt-1 text-xs text-red-600">{suggestError}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Job title</label>
        <Input
          required
          placeholder="e.g. Refrigerator not cooling"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Describe the problem</label>
        <Textarea
          required
          rows={4}
          placeholder="What's wrong, and any details that would help a pro quote accurately"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Photos (optional)</label>
        <PhotoUploader value={photoUrls} onChange={setPhotoUrls} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Budget min ($)</label>
          <Input type="number" min="0" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Budget max ($)</label>
          <Input type="number" min="0" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Preferred date</label>
        <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
      </div>

      <h3 className="mt-2 font-semibold text-gray-900">Property address</h3>
      {savedProperties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {savedProperties.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => fillAddress(p)}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-brand-500 hover:text-brand-700"
            >
              {p.addressLine1}, {p.city}
            </button>
          ))}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Street address</label>
        <Input required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
          <Input required value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
          <Input required value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Zip</label>
          <Input required value={zip} onChange={(e) => setZip(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit request'}
      </Button>
    </form>
  );
}
