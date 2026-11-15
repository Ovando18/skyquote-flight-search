/**
 * Amadeus — Flight Offers Search v2
 * Docs: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search
 */
import type { CabinClass, FlightOffer, SearchParams, Segment } from '@/lib/types';
import { airlineName } from '@/lib/airlines';
import { isoDurationToMin, normalizeLocal } from '@/lib/time';
import { buildSlice, fetchJson } from './normalize';

const CLASS: Record<CabinClass, string> = {
  economy: 'ECONOMY',
  premium_economy: 'PREMIUM_ECONOMY',
  business: 'BUSINESS',
  first: 'FIRST',
};

interface AmSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  aircraft?: { code?: string };
  operating?: { carrierCode?: string };
  duration?: string;
}
interface AmOffer {
  id: string;
  itineraries: { duration?: string; segments: AmSegment[] }[];
  price: { grandTotal?: string; total: string; currency: string };
  validatingAirlineCodes?: string[];
  numberOfBookableSeats?: number;
  travelerPricings?: {
    travelerType: string;
    price: { total: string };
    fareDetailsBySegment?: {
      cabin?: string;
      brandedFare?: string;
      brandedFareLabel?: string;
      class?: string;
      includedCheckedBags?: { quantity?: number; weight?: number };
    }[];
  }[];
}

const tokenCache = new Map<string, { token: string; exp: number }>();

async function getToken(host: string, id: string, secret: string) {
  const k = `${host}|${id}`;
  const c = tokenCache.get(k);
  if (c && c.exp > Date.now() + 30000) return c.token;
  const res = await fetchJson<{ access_token: string; expires_in: number }>(`${host}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
  });
  tokenCache.set(k, { token: res.access_token, exp: Date.now() + res.expires_in * 1000 });
  return res.access_token;
}

export async function searchAmadeus(
  params: SearchParams,
  clientId: string,
  clientSecret: string,
  env: 'test' | 'production' = 'test',
): Promise<FlightOffer[]> {
  const host = env === 'production' ? 'https://api.amadeus.com' : 'https://test.api.amadeus.com';
  const token = await getToken(host, clientId, clientSecret);
  const qs = new URLSearchParams({
    originLocationCode: params.origin,
    destinationLocationCode: params.destination,
    departureDate: params.departDate,
    adults: String(params.adults),
    travelClass: CLASS[params.cabin],
    currencyCode: 'BRL',
    max: '60',
  });
  if (params.children) qs.set('children', String(params.children));
  if (params.tripType === 'roundtrip' && params.returnDate) qs.set('returnDate', params.returnDate);
  if (params.airlines.length) qs.set('includedAirlineCodes', params.airlines.join(','));

  const res = await fetchJson<{ data?: AmOffer[] }>(`${host}/v2/shopping/flight-offers?${qs}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  return (res.data ?? []).map((o) => {
    const slices = o.itineraries.map((it, i) => {
      const segments: Segment[] = it.segments.map((s) => ({
        carrier: s.carrierCode,
        operatingCarrier: s.operating?.carrierCode !== s.carrierCode ? s.operating?.carrierCode : undefined,
        flightNumber: `${s.carrierCode}${s.number}`,
        from: s.departure.iataCode,
        to: s.arrival.iataCode,
        departure: normalizeLocal(s.departure.at),
        arrival: normalizeLocal(s.arrival.at),
        durationMin: isoDurationToMin(s.duration),
        aircraft: s.aircraft?.code,
      }));
      return buildSlice(i === 0 ? 'outbound' : 'inbound', segments, isoDurationToMin(it.duration));
    });
    const total = Number(o.price.grandTotal ?? o.price.total);
    const adult = o.travelerPricings?.find((t) => t.travelerType === 'ADULT');
    const child = o.travelerPricings?.find((t) => t.travelerType === 'CHILD');
    const fd = adult?.fareDetailsBySegment?.[0];
    const bags = fd?.includedCheckedBags;
    const carrier = o.validatingAirlineCodes?.[0] ?? slices[0].segments[0].carrier;
    return {
      id: `amadeus-${o.id}`,
      provider: 'amadeus' as const,
      simulated: env === 'test',
      isAward: false,
      airline: carrier,
      airlineName: airlineName(carrier),
      slices,
      cabin: params.cabin,
      fareBrand: fd?.brandedFareLabel ?? fd?.brandedFare ?? fd?.cabin ?? 'Tarifa publicada',
      bookingClass: fd?.class,
      baggage: {
        personalItem: true,
        carryOnKg: 10,
        checkedBags: bags?.quantity ?? (bags?.weight ? 1 : 0),
        checkedKg: bags?.weight ?? (bags?.quantity ? 23 : null),
      },
      currency: o.price.currency,
      totalPrice: total,
      pricePerAdult: adult ? Number(adult.price.total) : total / (params.adults + params.children),
      pricePerChild: child ? Number(child.price.total) : undefined,
      totalDurationMin: slices.reduce((s, x) => s + x.durationMin, 0),
      seatsRemaining: o.numberOfBookableSeats,
      sortPrice: total,
    };
  });
}
