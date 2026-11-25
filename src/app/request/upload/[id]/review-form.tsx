'use client';

import type { RepairLineItem } from '@prisma/client';
import Link from 'next/link';
import { useState } from 'react';

import { AddressAutocompleteInput } from '@/components/address-autocomplete-input';
import { AttachmentThumb } from '@/components/attachment-thumb';
import { ConnectingProsOverlay } from '@/components/connecting-pros-overlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { MultiFileUploader } from '@/components/multi-file-uploader';

const MIN_CONNECTING_MS = 1400;

interface CategoryOption {
  id: string;
  name: string;
}

interface DocumentProp {
  id: string;
  fileUrl: string;
  originalFilename: string;
  supportingDocumentUrls: string[];
  extractedAddressLine1: string | null;
  extractedCity: string | null;
  extractedState: string | null;
  extractedZip: string | null;
  lineItems: RepairLineItem[];
}

interface ItemState {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  selected: boolean;
  photoUrls: string[];
}

export function ReviewForm({
  document,
  categories,
  initialPhone,
}: {
  document: DocumentProp;
  categories: CategoryOption[];
  initialPhone?: string | null;
}) {
  const [addressLine1, setAddressLine1] = useState(document.extractedAddressLine1 ?? '');
  const [city, setCity] = useState(document.extractedCity ?? '');
  const [state, setState] = useState(document.extractedState ?? '');
  const [zip, setZip] = useState(document.extractedZip ?? '');
  const [items, setItems] = useState<ItemState[]>(
    document.lineItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      categoryId: item.categoryId ?? item.suggestedCategoryId ?? categories[0]?.id ?? '',
      selected: item.selected,
      photoUrls: item.photoUrls,
    })),
  );
  const [supportingDocumentUrls, setSupportingDocumentUrls] = useState<string[]>(document.supportingDocumentUrls);
  const [preferredDate, setPreferredDate] = useState('');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [ccEmails, setCcEmails] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; title: string }[] | null>(null);

  const selectedCount = items.filter((i) => i.selected).length;
  const allSelected = items.length > 0 && selectedCount === items.length;

  function updateItem(id: string, patch: Partial<ItemState>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function setAllSelected(selected: boolean) {
    setItems((prev) => prev.map((i) => ({ ...i, selected })));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
        title: '',
        description: '',
        categoryId: categories[0]?.id ?? '',
        selected: true,
        photoUrls: [],
      },
    ]);
  }

  async function handleSubmit() {
    const selectedItems = items.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      setError('Select at least one item to send.');
      return;
    }
    if (!addressLine1 || !city || !state || !zip) {
      setError('Fill in the full property address before sending.');
      return;
    }
    const incompleteItem = selectedItems.find((i) => !i.title.trim() || !i.description.trim());
    if (incompleteItem) {
      setError('Fill in a title and description for every selected item.');
      return;
    }
    if (!phone.trim()) {
      setError('Enter a phone number before sending.');
      return;
    }

    setLoading(true);
    setError(null);
    const start = Date.now();

    const res = await fetch(`/api/repair-documents/${document.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property: { addressLine1, city, state, zip },
        items: selectedItems.map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          categoryId: i.categoryId,
          photoUrls: i.photoUrls,
        })),
        supportingDocumentUrls,
        preferredDate: preferredDate || null,
        phone,
        ccEmails: ccEmails.map((e) => e.trim()).filter(Boolean),
      }),
    });
    const data = res.ok ? await res.json() : await res.json().catch(() => ({}));

    const elapsed = Date.now() - start;
    if (elapsed < MIN_CONNECTING_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_CONNECTING_MS - elapsed));
    }
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not send these requests.');
      return;
    }

    setCreated(data.requests);
  }

  if (created) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-gray-900">Sent {created.length} request(s) to pros</h2>
          <p className="text-sm text-gray-600">Each one is now visible to matching pros in your area.</p>
          <ul className="flex flex-col gap-1">
            {created.map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${r.id}`} className="text-brand-600 hover:underline">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/customer">
            <Button className="mt-2 w-fit">Go to your dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {loading && (
        <ConnectingProsOverlay
          title="Sending your requests to local pros…"
          subtitle={`Matching ${selectedCount} item${selectedCount === 1 ? '' : 's'} to verified pros near you.`}
        />
      )}
      <Card>
        <CardContent>
          <h2 className="mb-3 font-semibold text-gray-900">Property address</h2>
          <div className="flex flex-col gap-3">
            <AddressAutocompleteInput
              value={addressLine1}
              onChange={setAddressLine1}
              placeholder="Street address"
              onSelect={(address) => {
                setAddressLine1(address.addressLine1);
                if (address.city) setCity(address.city);
                if (address.state) setState(address.state);
                if (address.zip) setZip(address.zip);
              }}
            />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
              <Input placeholder="Zip" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">
          {selectedCount} of {items.length} item(s) selected
        </h2>
        <div className="flex items-center gap-4">
          <button type="button" onClick={addItem} className="text-sm font-medium text-brand-700 hover:underline">
            + Add item
          </button>
          <button
            type="button"
            onClick={() => setAllSelected(!allSelected)}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <Card key={item.id} className={item.selected ? '' : 'opacity-50'}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1.5"
                  checked={item.selected}
                  onChange={(e) => updateItem(item.id, { selected: e.target.checked })}
                />
                <div className="flex-1">
                  <Input
                    className="mb-2 font-medium"
                    placeholder="Item title"
                    value={item.title}
                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Describe the repair needed"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  />
                  <div className="mt-2 w-56">
                    <Select value={item.categoryId} onChange={(e) => updateItem(item.id, { categoryId: e.target.value })}>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Photo of this item (optional)
                    </label>
                    <MultiFileUploader
                      value={item.photoUrls}
                      onChange={(urls) => updateItem(item.id, { photoUrls: urls })}
                      max={5}
                      preferCamera
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          <h2 className="mb-1 font-semibold text-gray-900">Timing (optional)</h2>
          <p className="mb-3 text-sm text-gray-500">
            Applies to every request below — gives pros useful context without asking for it per item.
          </p>
          <div className="max-w-xs">
            <label className="mb-1 block text-xs font-medium text-gray-500">Preferred date</label>
            <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="mb-1 font-semibold text-gray-900">Your phone number</h2>
          <p className="mb-3 text-sm text-gray-500">
            Only shared with a pro once you accept their quote — never before.
          </p>
          <div className="max-w-xs">
            <Input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="mb-1 font-semibold text-gray-900">Also send quotes to (optional)</h2>
          <p className="mb-3 text-sm text-gray-500">
            Add your buyer's or seller's email so they get the same quotes you do, for every request below — no
            forwarding needed.
          </p>
          <div className="flex flex-col gap-2">
            {ccEmails.map((value, i) => (
              <div key={i} className="flex max-w-sm gap-2">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={value}
                  onChange={(e) => setCcEmails((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
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
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="mb-1 font-semibold text-gray-900">4. Full report & any other documents</h2>
          <p className="mb-3 text-sm text-gray-500">
            Attached in full to every request below, so a pro can open the original report themselves — useful if
            it has photos or context beyond what you added per item above. Optional.
          </p>
          <div className="mb-3 flex flex-wrap gap-3">
            <AttachmentThumb url={document.fileUrl} />
          </div>
          <MultiFileUploader value={supportingDocumentUrls} onChange={setSupportingDocumentUrls} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button size="lg" disabled={loading} onClick={handleSubmit} className="w-fit">
        {loading ? 'Sending…' : `Send ${items.filter((i) => i.selected).length} request(s) to professionals`}
      </Button>
    </div>
  );
}
