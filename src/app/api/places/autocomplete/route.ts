import { NextResponse } from 'next/server';

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Server-proxied so the Google Places key stays server-side rather than
// shipping a browser-exposed key — this is the only place that calls Google.
export async function GET(req: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ predictions: [] });
  }

  const allowed = await checkRateLimit(`places-autocomplete:${getClientIp(req)}`, 60, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const input = new URL(req.url).searchParams.get('input')?.trim();
  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', input);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('components', 'country:us');
  url.searchParams.set('types', 'address');

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places autocomplete error', data.status, data.error_message);
      return NextResponse.json({ predictions: [] });
    }
    const predictions = (data.predictions ?? []).map((p: { place_id: string; description: string }) => ({
      placeId: p.place_id,
      description: p.description,
    }));
    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('Places autocomplete request failed', error);
    return NextResponse.json({ predictions: [] });
  }
}
