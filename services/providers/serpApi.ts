/**
 * SerpApi — Google Flights
 * Docs: https://serpapi.com/google-flights-api
 * Ida e volta: a 1ª chamada retorna as idas (preço = total ida+volta) e um departure_token;
 * uma 2ª chamada com o token traz as opções de volta.
 */
import type { CabinClass, FlightOffer, SearchParams, Segment, Slice } from '@/lib/types';
import { airlineName } from '@/lib/airlines';
import { normalizeLocal } from '@/lib/time';
import { buildSlice, fetchJson } from './normalize';

const ENDPOINT = 'https://serpapi.com/search.json';
const CLASS: Record<CabinClass, string> = { economy: '1', premium_economy: '2', business: '3', first: '4' };

interface GFLeg {
  departure_airport?: { id?: string; time?: string };
  arrival_airport?: { id?: string; time?: string };
  duration?: number;
  airplane?: string;
  airline?: string;
  flight_number?: string;
  travel_class?: string;
}
interface GFItinerary {
  flights?: GFLeg[];
  layovers?: { duration?: number; id?: string; overnight?: boolean }[];
  total_duration?: number;
  price?: number;
  departure_token?: string;
  extensions?: string[];
}
interface GFResponse {
  error?: string;
  best_flights?: GFItinerary[];
  other_flights?: GFItinerary[];
}

function toSlice(it: GFItinerary, direction: Slice['direction']): Slice {
  const segments: Segment[] = (it.flights ?? []).map((f) => {
    const fn = (f.flight_number ?? '').replace(/\s/g, '');
    return {
      carrier: fn.slice(0, 2),
      flightNumber: fn,
      from: f.departure_airport?.id ?? '',
      to: f.arrival_airport?.id ?? '',
      departure: normalizeLocal(f.departure_airport?.time ?? ''),
      arrival: normalizeLocal(f.arrival_airport?.time ?? ''),
      durationMin: f.duration ?? 0,
      aircraft: f.airplane,
    };
  });
  return buildSlice(
    direction,
    segments,
    it.total_duration,
    (it.layovers ?? []).map((l) => ({ airport: l.id, durationMin: l.duration, overnight: l.overnight })),
  );
}

export async function searchSerpApi(params: SearchParams, apiKey: string): Promise<FlightOffer[]> {
  const roundtrip = params.tripType === 'roundtrip' && !!params.returnDate;
  const base: Record<string, string> = {
    engine: 'google_flights',
    departure_id: params.origin,
    arrival_id: params.destination,
    outbound_date: params.departDate,
    type: roundtrip ? '1' : '2',
    travel_class: CLASS[params.cabin],
    adults: String(params.adults),
    children: String(params.children),
    currency: 'BRL',
    hl: 'pt',
    gl: 'br',
    api_key: apiKey,
  };
  if (roundtrip) base.return_date = params.returnDate!;
  if (params.airlines.length) base.include_airlines = params.airlines.join(',');

  const first = await fetchJson<GFResponse>(`${ENDPOINT}?${new URLSearchParams(base)}`);
  if (first.error) throw new Error(first.error);
  const outbound = [...(first.best_flights ?? []), ...(first.other_flights ?? [])];
  const pax = params.adults + params.children;
  const offers: FlightOffer[] = [];

  const make = (out: GFItinerary, back: GFItinerary | undefined, price: number, idx: number): FlightOffer => {
    const slices = [toSlice(out, 'outbound')];
    if (back) slices.push(toSlice(back, 'inbound'));
    const carrier = slices[0].segments[0]?.carrier ?? '';
    const cls = out.flights?.[0]?.travel_class;
    return {
      id: `serp-${idx}-${slices.map((s) => s.segments.map((g) => g.flightNumber).join('')).join('-')}`,
      provider: 'serpapi',
      simulated: false,
      isAward: false,
      airline: carrier,
      airlineName: out.flights?.[0]?.airline ?? airlineName(carrier),
      slices,
      cabin: params.cabin,
      fareBrand: cls ?? 'Tarifa Google Flights',
      baggage: {
        personalItem: true,
        carryOnKg: null,
        checkedBags: 0,
        checkedKg: null,
        note: (out.extensions ?? []).find((e) => /bag|mala|bagagem/i.test(e)) ?? 'Franquia conforme tarifa da companhia',
      },
      currency: 'BRL',
      totalPrice: price,
      pricePerAdult: price / pax,
      totalDurationMin: slices.reduce((s, x) => s + x.durationMin, 0),
      sortPrice: price,
    };
  };

  if (!roundtrip) {
    outbound.forEach((o, i) => o.price && offers.push(make(o, undefined, o.price, i)));
    return offers;
  }

  // Ida e volta: busca as voltas para as 5 melhores idas (cada chamada consome 1 crédito)
  const top = outbound.filter((o) => o.departure_token && o.price).slice(0, 5);
  const returns = await Promise.allSettled(
    top.map((o) =>
      fetchJson<GFResponse>(
        `${ENDPOINT}?${new URLSearchParams({ ...base, departure_token: o.departure_token! })}`,
      ),
    ),
  );
  top.forEach((o, i) => {
    const r = returns[i];
    if (r.status !== 'fulfilled') return;
    const backs = [...(r.value.best_flights ?? []), ...(r.value.other_flights ?? [])].filter((b) => b.price);
    backs.slice(0, 2).forEach((b, j) => offers.push(make(o, b, b.price!, i * 10 + j)));
  });
  return offers;
}
