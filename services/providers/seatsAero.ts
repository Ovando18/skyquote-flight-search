/**
 * Seats.aero Partner API — disponibilidade award (milhas)
 * Docs: https://developers.seats.aero  (header "Partner-Authorization: <chave>")
 *
 * Fluxo: GET /partnerapi/search (Cached Search) com include_trips=true
 *        -> cada Availability traz AvailabilityTrips com segmentos, milhas e taxas.
 * Observação: TotalTaxes é retornado em centavos da moeda TaxesCurrency.
 */
import type { Baggage, CabinClass, FlightOffer, SearchParams, Segment, Slice } from '@/lib/types';
import { CABIN_SHORT } from '@/lib/types';
import { airlineName } from '@/lib/airlines';
import { normalizeLocal } from '@/lib/time';
import { buildSlice, fetchJson, toBRL } from './normalize';

const BASE = 'https://seats.aero/partnerapi';

const CABIN_PARAM: Record<CabinClass, string> = {
  economy: 'economy',
  premium_economy: 'premium',
  business: 'business',
  first: 'first',
};

interface SATripSegment {
  FlightNumber?: string;
  OriginAirport?: string;
  DestinationAirport?: string;
  DepartsAt?: string;
  ArrivesAt?: string;
  AircraftName?: string;
  Order?: number;
}

interface SATrip {
  ID?: string;
  Cabin?: string;
  TotalDuration?: number;
  Stops?: number;
  Carriers?: string;
  RemainingSeats?: number;
  MileageCost?: number;
  TotalTaxes?: number;
  TaxesCurrency?: string;
  Source?: string;
  AvailabilitySegments?: SATripSegment[];
}

interface SAAvailability {
  ID: string;
  Date?: string;
  Source?: string;
  Route?: { OriginAirport?: string; DestinationAirport?: string; Source?: string };
  AvailabilityTrips?: SATrip[] | null;
}

interface SASearchResponse {
  data?: SAAvailability[];
}

const SOURCE_NAMES: Record<string, string> = {
  smiles: 'Smiles',
  azul: 'Azul Fidelidade',
  aeroplan: 'Air Canada Aeroplan',
  american: 'AAdvantage',
  flyingblue: 'Flying Blue',
  united: 'United MileagePlus',
  delta: 'Delta SkyMiles',
  qatar: 'Qatar Privilege Club',
  virginatlantic: 'Virgin Atlantic Flying Club',
  lifemiles: 'Avianca LifeMiles',
  connectmiles: 'Copa ConnectMiles',
  emirates: 'Emirates Skywards',
  alaska: 'Alaska Mileage Plan',
  etihad: 'Etihad Guest',
  qantas: 'Qantas Frequent Flyer',
  velocity: 'Velocity',
  eurobonus: 'SAS EuroBonus',
  aeromexico: 'Aeroméxico Rewards',
  turkish: 'Turkish Miles&Smiles',
  singapore: 'KrisFlyer',
  jetblue: 'JetBlue TrueBlue',
  ethiopian: 'ShebaMiles',
  saudia: 'Saudia AlFursan',
};

interface ParsedTrip {
  slice: Slice;
  carrier: string;
  miles: number;
  taxes: number;
  taxesCurrency: string;
  seats?: number;
  source: string;
}

function parseTrip(trip: SATrip, direction: Slice['direction'], source: string): ParsedTrip | null {
  const segs = [...(trip.AvailabilitySegments ?? [])].sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0));
  if (!segs.length) return null;
  const segments: Segment[] = segs.map((s) => {
    const fn = (s.FlightNumber ?? '').replace(/\s/g, '');
    return {
      carrier: fn.slice(0, 2) || (trip.Carriers ?? '').split(',')[0]?.trim() || '??',
      flightNumber: fn || '—',
      from: s.OriginAirport ?? '',
      to: s.DestinationAirport ?? '',
      // Seats.aero devolve horários locais do aeroporto com sufixo Z
      departure: normalizeLocal(s.DepartsAt ?? ''),
      arrival: normalizeLocal(s.ArrivesAt ?? ''),
      durationMin: 0,
      aircraft: s.AircraftName,
    };
  });
  return {
    slice: buildSlice(direction, segments, trip.TotalDuration),
    carrier: segments[0].carrier,
    miles: Number(trip.MileageCost ?? 0),
    taxes: Number(trip.TotalTaxes ?? 0) / 100,
    taxesCurrency: trip.TaxesCurrency || 'USD',
    seats: trip.RemainingSeats,
    source: trip.Source ?? source,
  };
}

async function searchDirection(
  key: string,
  from: string,
  to: string,
  date: string,
  cabin: CabinClass,
  direction: Slice['direction'],
): Promise<ParsedTrip[]> {
  const qs = new URLSearchParams({
    origin_airport: from,
    destination_airport: to,
    start_date: date,
    end_date: date,
    cabins: CABIN_PARAM[cabin],
    include_trips: 'true',
    take: '100',
  });
  const res = await fetchJson<SASearchResponse>(`${BASE}/search?${qs}`, {
    headers: { 'Partner-Authorization': key, accept: 'application/json' },
  });
  const wanted = CABIN_PARAM[cabin];
  const trips: ParsedTrip[] = [];
  for (const av of res.data ?? []) {
    const source = av.Source ?? av.Route?.Source ?? 'seats.aero';
    for (const t of av.AvailabilityTrips ?? []) {
      if (t.Cabin && t.Cabin.toLowerCase() !== wanted) continue;
      const p = parseTrip(t, direction, source);
      if (p && p.miles > 0) trips.push(p);
    }
  }
  return trips;
}

export async function searchSeatsAero(
  params: SearchParams,
  key: string,
  milheiro: number,
): Promise<FlightOffer[]> {
  const pax = params.adults + params.children;
  const outs = await searchDirection(key, params.origin, params.destination, params.departDate, params.cabin, 'outbound');
  const roundtrip = params.tripType === 'roundtrip' && !!params.returnDate;
  const ins = roundtrip
    ? await searchDirection(key, params.destination, params.origin, params.returnDate!, params.cabin, 'inbound')
    : [];

  const eligible = (t: ParsedTrip) => t.seats === undefined || t.seats >= pax;
  const outList = outs.filter(eligible).sort((a, b) => a.miles - b.miles).slice(0, 40);
  const offers: FlightOffer[] = [];

  for (const out of outList) {
    let parts: ParsedTrip[] = [out];
    if (roundtrip) {
      // combina com o retorno mais barato do mesmo programa
      const back = ins.filter((t) => t.source === out.source && eligible(t)).sort((a, b) => a.miles - b.miles)[0];
      if (!back) continue;
      parts = [out, back];
    }
    const milesPerPax = parts.reduce((s, p) => s + p.miles, 0);
    const cur = parts[0].taxesCurrency;
    const taxesPerPax = parts.reduce((s, p) => s + p.taxes, 0);
    const pointsTotal = milesPerPax * pax;
    const taxesTotal = taxesPerPax * pax;
    const equivalent = toBRL(taxesTotal, cur) + (pointsTotal / 1000) * milheiro;
    const slices = parts.map((p) => p.slice);
    const program = SOURCE_NAMES[out.source] ?? out.source;
    const baggage: Baggage = { personalItem: true, carryOnKg: null, checkedBags: 0, checkedKg: null, note: 'Franquia conforme regra do programa / cia operadora' };
    const seats = parts.map((p) => p.seats).filter((s): s is number => typeof s === 'number');
    offers.push({
      id: `seats-${out.source}-${slices.map((s) => s.segments.map((g) => g.flightNumber).join('')).join('-')}`,
      provider: 'seats.aero',
      simulated: false,
      isAward: true,
      airline: out.carrier,
      airlineName: airlineName(out.carrier),
      slices,
      cabin: params.cabin,
      fareBrand: `Resgate ${CABIN_SHORT[params.cabin]} · ${program}`,
      baggage,
      currency: cur,
      totalPrice: taxesTotal,
      pricePerAdult: taxesPerPax,
      miles: {
        program,
        programId: out.source,
        pointsPerPassenger: milesPerPax,
        pointsTotal,
        taxesPerPassenger: taxesPerPax,
        taxesTotal,
        taxesCurrency: cur,
        seatsRemaining: seats.length ? Math.min(...seats) : undefined,
        equivalentBRL: equivalent,
      },
      totalDurationMin: slices.reduce((s, x) => s + x.durationMin, 0),
      seatsRemaining: seats.length ? Math.min(...seats) : undefined,
      sortPrice: equivalent,
    });
  }
  return offers;
}
