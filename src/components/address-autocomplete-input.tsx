'use client';

import { useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';

interface Prediction {
  placeId: string;
  description: string;
}

export interface ParsedAddress {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
}

// Debounced Google Places lookup, with plain-text typing always working as a
// fallback — suggestions are a convenience, not a requirement, so this never
// blocks manual entry if the API key isn't configured or a lookup fails.
export function AddressAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address…',
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: ParsedAddress) => void;
  placeholder?: string;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(newValue: string) {
    onChange(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (newValue.trim().length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(newValue)}`).catch(() => null);
      if (!res || !res.ok) return;
      const data = await res.json().catch(() => ({ predictions: [] }));
      setPredictions(data.predictions ?? []);
      setOpen((data.predictions ?? []).length > 0);
    }, 300);
  }

  async function handleSelect(prediction: Prediction) {
    setOpen(false);
    onChange(prediction.description);
    setLoadingDetails(true);
    const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(prediction.placeId)}`).catch(() => null);
    setLoadingDetails(false);
    if (!res || !res.ok) return;
    const data = await res.json().catch(() => null);
    if (data?.addressLine1) {
      onChange(data.addressLine1);
      onSelect(data);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Input
        required
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {loadingDetails && <p className="mt-1 text-xs text-gray-400">Filling in address details…</p>}
      {open && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {predictions.map((p) => (
            <button
              key={p.placeId}
              type="button"
              onClick={() => handleSelect(p)}
              className="block w-full border-b border-gray-50 px-3 py-2 text-left text-sm text-gray-700 last:border-b-0 hover:bg-gray-50"
            >
              {p.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
