import { NextResponse } from 'next/server';

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function componentByType(components: AddressComponent[], type: string, useShortName = false) {
  const match = components.find((c) => c.types.includes(type));
  return match ? (useShortName ? match.short_name : match.long_name) : '';
}

export async function GET(req: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Address lookup is not configured.' }, { status: 503 });
  }

  const allowed = await checkRateLimit(`places-details:${getClientIp(req)}`, 60, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const placeId = new URL(req.url).searchParams.get('place_id');
  if (!placeId) {
    return NextResponse.json({ error: 'Missing place_id.' }, { status: 400 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('fields', 'address_component');

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.status !== 'OK') {
      console.error('Places details error', data.status, data.error_message);
      return NextResponse.json({ error: 'Could not look up that address.' }, { status: 502 });
    }

    const components: AddressComponent[] = data.result?.address_components ?? [];
    const streetNumber = componentByType(components, 'street_number');
    const route = componentByType(components, 'route');
    const addressLine1 = [streetNumber, route].filter(Boolean).join(' ');
    const city =
      componentByType(components, 'locality') || componentByType(components, 'sublocality') || componentByType(components, 'postal_town');
    const state = componentByType(components, 'administrative_area_level_1', true);
    const zip = componentByType(components, 'postal_code');

    return NextResponse.json({ addressLine1, city, state, zip });
  } catch (error) {
    console.error('Places details request failed', error);
    return NextResponse.json({ error: 'Could not look up that address.' }, { status: 502 });
  }
}
