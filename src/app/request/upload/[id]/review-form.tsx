'use client';

import type { RepairLineItem } from '@prisma/client';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';

interface CategoryOption {
  id: string;
  name: string;
}

interface DocumentProp {
  id: string;
  extractedAddressLine1: string | null;
  extractedCity: string | null;
  extractedState: string | null;
  extractedZip: string | null;
  lineItems: RepairLineItem[];
}

const pageImageById = (document: DocumentProp, id: string) =>
  document.lineItems.find((i) => i.id === id)?.pageImageUrl ?? null;

interface ItemState {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  selected: boolean;
}

export function ReviewForm({ document, categories }: { document: DocumentProp; categories: CategoryOption[] }) {
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
    })),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; title: string }[] | null>(null);

  function updateItem(id: string, patch: Partial<ItemState>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
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

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/repair-documents/${document.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property: { addressLine1, city, state, zip },
        items: selectedItems.map((i) => ({ id: i.id, title: i.title, description: i.description, categoryId: i.categoryId })),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not send these requests.');
      return;
    }

    const data = await res.json();
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
      <Card>
        <CardContent>
          <h2 className="mb-3 font-semibold text-gray-900">Property address</h2>
          <div className="flex flex-col gap-3">
            <Input placeholder="Street address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
              <Input placeholder="Zip" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

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
                {pageImageById(document, item.id) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pageImageById(document, item.id)!}
                    alt="Document page"
                    className="h-24 w-20 flex-shrink-0 rounded border border-gray-200 object-cover object-top"
                  />
                )}
                <div className="flex-1">
                  <Input
                    className="mb-2 font-medium"
                    value={item.title}
                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
                  />
                  <Textarea
                    rows={2}
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
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button size="lg" disabled={loading} onClick={handleSubmit} className="w-fit">
        {loading ? 'Sending…' : `Send ${items.filter((i) => i.selected).length} request(s) to professionals`}
      </Button>
    </div>
  );
}
