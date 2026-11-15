/**
 * Duffel — Offer Requests
 * Docs: https://duffel.com/docs/api/offer-requests/create-offer-request
 */
import type { FlightOffer, SearchParams, Segment } from '@/lib/types';
import { isoDurationToMin, normalizeLocal } from '@/lib/time';
import { buildSlice, fetchJson, toBRL } from './normalize';

interface DuffelSegment {
  origin: { iata_code: string };
  destination: { iata_code: string };
  departing_at: string;
  arriving_at: string;
  duration?: string;
  marketing_carrier: { iata_code: string };
  marketing_carrier_flight_number: string;
  operating_carrier?: { iata_code?: string };
  aircraft?: { name?: string };
  passengers?: {
    cabin_class_marketing_name?: string;
    fare_basis_code?: string;
    baggages?: { type: 'checked' | 'carry_on'; quantity: number }[];
  }[];
}
interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  owner: { iata_code: string; name: string };
  slices: { duration?: string; fare_brand_name?: string; segments: DuffelSegment[] }[];
}

export async function searchDuffel(params: SearchParams, token: string): Promise<FlightOffer[]> {
  const slices = [{ origin: params.origin, destination: params.destination, departure_date: params.departDate }];
  if (params.tripType === 'roundtrip' && params.returnDate)
    slices.push({ origin: params.destination, destination: params.origin, departure_date: params.returnDate });
  const passengers = [
    ...Array.from({ length: params.adults }, () => ({ type: 'adult' })),
    ...Array.from({ length: params.children }, () => ({ age: 8 })),
  ];
  const res = await fetchJson<{ data?: { offers?: DuffelOffer[] } }>(
    'https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=20000',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'duffel-version': 'v2',
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ data: { slices, passengers, cabin_class: params.cabin } }),
    },
    40000,
  );
  const pax = params.adults + params.children;
  return (res.data?.offers ?? [])
    .filter((o) => !params.airlines.length || params.airlines.includes(o.owner.iata_code))
    .slice(0, 60)
    .map((o) => {
      const sl = o.slices.map((s, i) => {
        const segments: Segment[] = s.segments.map((g) => ({
          carrier: g.marketing_carrier.iata_code,
          operatingCarrier:
            g.operating_carrier?.iata_code !== g.marketing_carrier.iata_code ? g.operating_carrier?.iata_code : undefined,
          flightNumber: `${g.marketing_carrier.iata_code}${g.marketing_carrier_flight_number}`,
          from: g.origin.iata_code,
          to: g.destination.iata_code,
          departure: normalizeLocal(g.departing_at),
          arrival: normalizeLocal(g.arriving_at),
          durationMin: isoDurationToMin(g.duration),
          aircraft: g.aircraft?.name,
        }));
        return buildSlice(i === 0 ? 'outbound' : 'inbound', segments, isoDurationToMin(s.duration));
      });
      const p0 = o.slices[0]?.segments[0]?.passengers?.[0];
      const checked = p0?.baggages?.find((b) => b.type === 'checked')?.quantity ?? 0;
      const carry = p0?.baggages?.find((b) => b.type === 'carry_on')?.quantity ?? 0;
      const total = Number(o.total_amount);
      return {
        id: `duffel-${o.id}`,
        provider: 'duffel' as const,
        simulated: token.startsWith('duffel_test'),
        isAward: false,
        airline: o.owner.iata_code,
        airlineName: o.owner.name,
        slices: sl,
        cabin: params.cabin,
        fareBrand: o.slices[0]?.fare_brand_name ?? p0?.cabin_class_marketing_name ?? 'Tarifa',
        bookingClass: p0?.fare_basis_code,
        baggage: { personalItem: true, carryOnKg: carry ? 10 : null, checkedBags: checked, checkedKg: checked ? 23 : null },
        currency: o.total_currency,
        totalPrice: total,
        pricePerAdult: total / pax,
        totalDurationMin: sl.reduce((s, x) => s + x.durationMin, 0),
        sortPrice: toBRL(total, o.total_currency),
      };
    });
}
