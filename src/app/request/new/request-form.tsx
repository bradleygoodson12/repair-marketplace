'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AddressAutocompleteInput } from '@/components/address-autocomplete-input';
import { ConnectingProsOverlay } from '@/components/connecting-pros-overlay';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { PhotoUploader } from '@/components/photo-uploader';

const MIN_CONNECTING_MS = 1400;

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
  initialPhone,
}: {
  categories: CategoryOption[];
  savedProperties?: SavedProperty[];
  initialPhone?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultSlug = searchParams.get('category');
  const defaultCategoryId = categories.find((c) => c.slug === defaultSlug)?.id ?? categories[0]?.id ?? '';

  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [ccEmails, setCcEmails] = useState<string[]>(['']);
  const [payAtCloseRequested, setPayAtCloseRequested] = useState(false);
  const [postedAsAgent, setPostedAsAgent] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
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
    const start = Date.now();

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId,
        title,
        description,
        preferredDate: preferredDate || null,
        photoUrls,
        phone,
        ccEmails: ccEmails.map((e) => e.trim()).filter(Boolean),
        payAtCloseRequested,
        postedAsAgent,
        clientName,
        clientEmail,
        clientPhone,
        property: { addressLine1, city, state, zip },
      }),
    });
    const data = res.ok ? await res.json() : await res.json().catch(() => ({}));

    const elapsed = Date.now() - start;
    if (elapsed < MIN_CONNECTING_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_CONNECTING_MS - elapsed));
    }

    if (!res.ok) {
      setLoading(false);
      setError(typeof data.error === 'string' ? data.error : 'Could not submit your request.');
      return;
    }

    // Leave the overlay up (loading stays true) through the navigation itself,
    // so there's no flash of the empty form while the destination page loads.
    router.push(`/requests/${data.id}`);
  }

  const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {loading && (
        <ConnectingProsOverlay
          subtitle={
            selectedCategoryName
              ? `Matching your ${selectedCategoryName.toLowerCase()} request to verified pros near you.`
              : undefined
          }
        />
      )}
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
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Preferred date</label>
        <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Your phone number</label>
        <Input
          type="tel"
          required
          placeholder="For the pro to reach you once they're hired"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500">
          Only shared with the pro once you accept their quote — never before.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 p-3">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Also send quotes to (optional)
        </label>
        <p className="mb-2 text-xs text-gray-500">
          Add your buyer's or seller's email so they get the same quotes you do — no forwarding needed.
        </p>
        <div className="flex flex-col gap-2">
          {ccEmails.map((value, i) => (
            <div key={i} className="flex gap-2">
              <Input
                type="email"
                placeholder="name@example.com"
                value={value}
                onChange={(e) =>
                  setCcEmails((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                }
              />
              {ccEmails.length > 1 && (
                <button
                  type="button"
                  onClick={() => setCcEmails((prev) => prev.filter((_, idx) => idx !== i))}
                  className="px-2 text-sm text-gray-400 hover:text-gray-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {ccEmails.length < 5 && (
          <button
            type="button"
            onClick={() => setCcEmails((prev) => [...prev, ''])}
            className="mt-2 text-sm font-medium text-brand-700 hover:underline"
          >
            + Add another email
          </button>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={postedAsAgent}
            onChange={(e) => setPostedAsAgent(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          I'm a real estate agent posting this on behalf of a client
        </label>
        {postedAsAgent && (
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Client name</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Client email</label>
                <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Client phone</label>
                <Input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Shared with the pro once you hire them, so they know who to coordinate access and scheduling with.
            </p>
          </div>
        )}
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
        <AddressAutocompleteInput
          value={addressLine1}
          onChange={setAddressLine1}
          onSelect={(address) => {
            setAddressLine1(address.addressLine1);
            if (address.city) setCity(address.city);
            if (address.state) setState(address.state);
            if (address.zip) setZip(address.zip);
          }}
        />
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

      <div className="rounded-lg border border-gray-200 p-3">
        <label className="flex items-start gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={payAtCloseRequested}
            onChange={(e) => setPayAtCloseRequested(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          I&apos;d be open to paying at closing, if the pro offers it
        </label>
        <p className="mt-1 pl-6 text-xs text-gray-500">
          Some pros may be willing to wait for payment until your sale closes. Checking this lets them know you&apos;d
          welcome that option — it&apos;s not guaranteed, and you can always work out payment terms directly with the
          pro.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit request'}
      </Button>
    </form>
  );
}
