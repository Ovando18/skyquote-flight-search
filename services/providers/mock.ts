/**
 * Mock Engine inteligente
 * -----------------------
 * Gera itinerários realistas e determinísticos (mesma busca => mesmos resultados) a partir de:
 *  - malha de hubs / destinos de cada companhia (lib/airlines.ts)
 *  - distância ortodrômica e tempo de bloco estimado
 *  - fusos horários IANA reais (horários locais, chegada +1 dia etc.)
 *  - precificação dinâmica: antecedência, sazonalidade, dia da semana, horário, cabine, família tarifária
 *  - disponibilidade award (Seats.aero) por programa de fidelidade
 */
import { getAirport, distanceKm, type Airport } from '@/lib/airports';
import { getAirline, LOYALTY_PROGRAMS, type Airline, type LoyaltyProgram } from '@/lib/airlines';
import { createRng, type Rng } from '@/lib/rng';
import { localToUtc, utcToLocal, dayDiff, todayISO, naiveMs } from '@/lib/time';
import {
  CABIN_SHORT,
  type Baggage,
  type CabinClass,
  type FlightOffer,
  type Layover,
  type SearchParams,
  type Segment,
  type Slice,
} from '@/lib/types';

interface Leg {
  from: string;
  to: string;
  carrier: string;
  feeder: boolean;
}

// ---------------------------------------------------------------------------
// Malha de rotas
// ---------------------------------------------------------------------------

function served(al: Airline, ap: Airport): boolean {
  if (al.hubs.includes(ap.code)) return true;
  if (al.home === 'BR') return ap.country === 'BR' || !!al.intl?.includes(ap.code);
  if (ap.country === 'BR') return !!al.brGateways?.includes(ap.code);
  if (ap.country === al.home) return true;
  if (al.intl?.includes(ap.code)) return true;
  if (!al.regions?.includes(ap.region)) return false;
  // Fora da região de origem da cia, apenas grandes hubs internacionais
  const homeRegion = getAirport(al.hubs[0])?.region;
  return ap.region === homeRegion || ap.size >= 3;
}

function legAllowed(al: Airline, a: Airport, b: Airport): boolean {
  if (a.country === b.country) return true;
  if (a.domesticOnly || b.domesticOnly) return false;
  if (al.home === 'BR') {
    const brEnd = a.country === 'BR' ? a : b.country === 'BR' ? b : null;
    if (brEnd && !(al.intlHubs ?? al.hubs).includes(brEnd.code)) return false;
  }
  return true;
}

function nearestGateway(al: Airline, ap: Airport): string | undefined {
  const gws = (al.brGateways ?? []).filter((g) => g !== ap.code);
  return gws
    .map((g) => ({ g, d: distanceKm(ap.code, g) - (getAirport(g)?.size ?? 1) * 120 }))
    .sort((x, y) => x.d - y.d)[0]?.g;
}

function coreRoutes(al: Airline, o: Airport, d: Airport): string[][] {
  if (o.code === d.code) return [];
  const routes: string[][] = [];
  const isHub = (x: Airport) => al.hubs.includes(x.code);
  const sameHome = o.country === al.home && d.country === al.home;
  const km = distanceKm(o, d);
  if (
    legAllowed(al, o, d) &&
    (isHub(o) || isHub(d) || (sameHome && o.size >= 2 && d.size >= 2) || (sameHome && km < 650))
  ) {
    routes.push([o.code, d.code]);
  }
  for (const h of al.hubs) {
    if (h === o.code || h === d.code) continue;
    const H = getAirport(h);
    if (!H) continue;
    // Ignora "conexões" na mesma cidade (ex.: GRU <-> CGH)
    if (distanceKm(H, o) < 120 || distanceKm(H, d) < 120) continue;
    if (legAllowed(al, o, H) && legAllowed(al, H, d)) routes.push([o.code, h, d.code]);
  }
  return routes;
}

export function buildPaths(al: Airline, oCode: string, dCode: string): Leg[][] {
  const o = getAirport(oCode);
  const d = getAirport(dCode);
  if (!o || !d || o.code === d.code) return [];

  let start = o;
  let end = d;
  let pre: Leg | null = null;
  let post: Leg | null = null;

  if (!served(al, o)) {
    if (!al.feeder || o.country !== 'BR') return [];
    const g = nearestGateway(al, o);
    if (!g) return [];
    pre = { from: o.code, to: g, carrier: al.feeder, feeder: true };
    start = getAirport(g)!;
  }
  if (!served(al, d)) {
    if (!al.feeder || d.country !== 'BR') return [];
    const g = nearestGateway(al, d);
    if (!g) return [];
    post = { from: g, to: d.code, carrier: al.feeder, feeder: true };
    end = getAirport(g)!;
  }
  if (start.code === end.code) return [];

  const gc = distanceKm(o, d);
  const maxDetour = gc < 900 ? 2.8 : gc < 2500 ? 2.1 : gc < 5000 ? 1.8 : 1.42;

  const paths = coreRoutes(al, start, end)
    .map((core) => {
      const legs: Leg[] = [];
      if (pre) legs.push(pre);
      for (let i = 0; i < core.length - 1; i++)
        legs.push({ from: core[i], to: core[i + 1], carrier: al.code, feeder: false });
      if (post) legs.push(post);
      return legs;
    })
    .filter((legs) => legs.length <= 3)
    .map((legs) => ({ legs, km: legs.reduce((s, l) => s + distanceKm(l.from, l.to), 0) }))
    .filter((p) => p.km / Math.max(gc, 1) <= maxDetour)
    .sort((a, b) => a.legs.length - b.legs.length || a.km - b.km);

  const seen = new Set<string>();
  return paths
    .filter((p) => {
      const k = p.legs.map((l) => l.from + l.to).join('-');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 3)
    .map((p) => p.legs);
}

// ---------------------------------------------------------------------------
// Programação de horários
// ---------------------------------------------------------------------------

const round5 = (n: number) => Math.round(n / 5) * 5;
const hhmm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

function blockTime(km: number): number {
  const cruise = km > 3000 ? 860 : km > 1200 ? 780 : 640;
  return round5((km / cruise) * 60 + (km > 3000 ? 35 : 28));
}

function anchorDepartureMinute(rng: Rng, from: Airport, km: number): number {
  if (km > 5500) {
    switch (from.region) {
      case 'BR':
      case 'SA':
        return rng.range(17 * 60, 23 * 60 + 40);
      case 'EU':
        return rng.chance(0.55) ? rng.range(9 * 60 + 30, 13 * 60 + 30) : rng.range(21 * 60, 23 * 60 + 50);
      case 'NA':
        return rng.range(18 * 60, 23 * 60 + 30);
      default:
        return rng.range(2 * 60, 9 * 60);
    }
  }
  return rng.range(5 * 60 + 40, 22 * 60 + 30);
}

function flightNumberFor(carrier: string, from: string, to: string, km: number, variant: number): string {
  const r = createRng(`fn|${carrier}|${from}|${to}|${variant}`);
  const n = km > 3500 ? r.int(10, 899) : r.int(1000, 9799);
  return `${carrier}${n}`;
}

interface ScheduledSlice {
  slice: Slice;
  depMinuteOfDay: number;
}

export function scheduleSlice(
  legs: Leg[],
  date: string,
  direction: Slice['direction'],
  seed: string,
  variant: number,
): ScheduledSlice {
  const rng = createRng(seed);
  const kms = legs.map((l) => distanceKm(l.from, l.to));
  const durs = kms.map(blockTime);
  const anchor = durs.indexOf(Math.max(...durs));
  const anchorFrom = getAirport(legs[anchor].from)!;

  const lays: number[] = [];
  for (let i = 0; i < legs.length - 1; i++) {
    const a = getAirport(legs[i].from)!;
    const b = getAirport(legs[i + 1].to)!;
    const intl = a.country !== b.country;
    let min = intl ? 95 : 50;
    if (legs[i].carrier !== legs[i + 1].carrier) min += 25;
    lays.push(round5(min + rng.range(0, intl ? 230 : 170)));
  }

  const depMin = round5(anchorDepartureMinute(rng, anchorFrom, kms[anchor]));
  const dep: number[] = new Array(legs.length);
  const arr: number[] = new Array(legs.length);
  dep[anchor] = localToUtc(`${date}T${hhmm(depMin)}`, anchorFrom.tz);
  arr[anchor] = dep[anchor] + durs[anchor] * 60000;
  const localMinute = (utc: number, code: string) => {
    const l = utcToLocal(utc, getAirport(code)!.tz);
    return +l.slice(11, 13) * 60 + +l.slice(14, 16);
  };
  for (let i = anchor + 1; i < legs.length; i++) {
    dep[i] = arr[i - 1] + lays[i - 1] * 60000;
    // Sem decolagens de madrugada: aguarda o primeiro banco de voos da manhã
    const m = localMinute(dep[i], legs[i].from);
    if (m >= 20 && m < 340) {
      dep[i] += (round5(340 - m + rng.range(0, 75))) * 60000;
      lays[i - 1] = Math.round((dep[i] - arr[i - 1]) / 60000);
    }
    arr[i] = dep[i] + durs[i] * 60000;
  }
  for (let i = anchor - 1; i >= 0; i--) {
    arr[i] = dep[i + 1] - lays[i] * 60000;
    dep[i] = arr[i] - durs[i] * 60000;
    const m = localMinute(dep[i], legs[i].from);
    if (m >= 0 && m < 340) {
      // antecipa para a noite anterior / fim da tarde
      dep[i] -= round5(m + 60 + rng.range(0, 150)) * 60000;
      arr[i] = dep[i] + durs[i] * 60000;
      lays[i] = Math.round((dep[i + 1] - arr[i]) / 60000);
    }
  }

  const firstTz = getAirport(legs[0].from)!.tz;
  // Evita partidas de madrugada (antes de 05:30) no primeiro trecho
  const firstLocal = utcToLocal(dep[0], firstTz);
  const mod = +firstLocal.slice(11, 13) * 60 + +firstLocal.slice(14, 16);
  let shift = 0;
  if (mod < 330) shift += (330 - mod + round5(rng.range(0, 90))) * 60000;
  // Garante que a viagem começa na data pesquisada
  const days = dayDiff(date, utcToLocal(dep[0] + shift, firstTz));
  shift -= days * 86400000;

  const segments: Segment[] = legs.map((l, i) => {
    const al = getAirline(l.carrier);
    const fleet = kms[i] > 3500 ? al?.longFleet : al?.shortFleet;
    const departure = utcToLocal(dep[i] + shift, getAirport(l.from)!.tz);
    return {
      carrier: l.carrier,
      // número do voo estável por companhia/trecho/horário
      flightNumber: flightNumberFor(l.carrier, l.from, l.to, kms[i], +departure.slice(11, 13)),
      from: l.from,
      to: l.to,
      departure,
      arrival: utcToLocal(arr[i] + shift, getAirport(l.to)!.tz),
      durationMin: durs[i],
      aircraft: fleet ? createRng(`ac|${l.carrier}|${l.from}${l.to}|${variant}`).pick(fleet) : undefined,
    };
  });

  const layovers: Layover[] = lays.map((lay, i) => ({
    airport: legs[i].to,
    durationMin: lay,
    overnight: segments[i].arrival.slice(0, 10) !== segments[i + 1].departure.slice(0, 10) && lay >= 240,
  }));

  const firstDep = segments[0].departure;
  return {
    slice: {
      direction,
      segments,
      layovers,
      durationMin: Math.round((arr[legs.length - 1] - dep[0]) / 60000),
    },
    depMinuteOfDay: +firstDep.slice(11, 13) * 60 + +firstDep.slice(14, 16),
  };
}

// ---------------------------------------------------------------------------
// Precificação
// ---------------------------------------------------------------------------

interface Brand {
  name: string;
  mult: number;
  baggage: Baggage;
  bookingClass: string;
}

const bag = (carryOnKg: number | null, checkedBags: number, checkedKg: number | null): Baggage => ({
  personalItem: true,
  carryOnKg,
  checkedBags,
  checkedKg,
});

function brandsFor(al: Airline, cabin: CabinClass, domestic: boolean, rng: Rng): Brand[] {
  const nat = al.group === 'national';
  switch (cabin) {
    case 'economy': {
      const list: Brand[] = [
        { name: nat ? 'Light' : 'Basic', mult: 1, baggage: bag(10, 0, null), bookingClass: rng.pick(['O', 'Q', 'N']) },
      ];
      if (rng.chance(0.85))
        list.push({
          name: nat ? 'Standard' : 'Classic',
          mult: domestic ? 1.24 : 1.16,
          baggage: bag(10, 1, 23),
          bookingClass: rng.pick(['S', 'L', 'M']),
        });
      if (rng.chance(0.45))
        list.push({
          name: nat ? 'Full' : 'Flex',
          mult: domestic ? 1.6 : 1.42,
          baggage: bag(10, domestic ? 1 : 2, 23),
          bookingClass: rng.pick(['H', 'B', 'Y']),
        });
      return list;
    }
    case 'premium_economy':
      return [{ name: 'Premium Economy', mult: 1, baggage: bag(10, 2, 23), bookingClass: rng.pick(['W', 'P', 'E']) }];
    case 'business': {
      const list: Brand[] = [
        { name: 'Executiva', mult: 1, baggage: bag(12, 2, 32), bookingClass: rng.pick(['Z', 'I', 'D']) },
      ];
      if (rng.chance(0.35))
        list.push({ name: 'Executiva Flex', mult: 1.28, baggage: bag(12, 2, 32), bookingClass: 'J' });
      return list;
    }
    case 'first':
      return [{ name: 'Primeira Classe', mult: 1, baggage: bag(14, 3, 32), bookingClass: rng.pick(['F', 'A']) }];
  }
}

function basePricePerAdult(
  al: Airline,
  legs: Leg[],
  date: string,
  depMinute: number,
  cabin: CabinClass,
  domestic: boolean,
  rng: Rng,
): number {
  const km = legs.reduce((s, l) => s + distanceKm(l.from, l.to), 0);
  const gc = distanceKm(legs[0].from, legs[legs.length - 1].to);
  const rate = domestic ? 0.46 : gc < 4000 ? 0.42 : 0.34;
  let p = 190 + (km * 0.35 + gc * 0.65) * rate;

  const cabinMult: Record<CabinClass, number> = {
    economy: 1,
    premium_economy: 1.75,
    business: domestic ? 2.5 : 3.7,
    first: 6.8,
  };
  p *= cabinMult[cabin] * al.priceFactor;
  p *= 1 - 0.06 * (legs.length - 1);

  const ahead = dayDiff(todayISO(), date);
  p *= ahead < 7 ? 1.5 : ahead < 21 ? 1.22 : ahead < 60 ? 1.04 : ahead < 150 ? 0.93 : 0.98;

  const month = +date.slice(5, 7);
  if (month === 12 || month === 1 || month === 7) p *= 1.17;
  const dow = new Date(naiveMs(date)).getUTCDay();
  if (dow === 5 || dow === 0) p *= 1.08;
  if (dow === 2 || dow === 3) p *= 0.93;
  if (depMinute < 360 || depMinute >= 22 * 60) p *= 0.93;

  p *= rng.range(0.84, 1.26);
  return p;
}

const cents = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Ofertas pagas (dinheiro)
// ---------------------------------------------------------------------------

interface SliceOption {
  slice: Slice;
  legs: Leg[];
  base: number;
  key: string;
}

function sliceOptions(
  al: Airline,
  from: string,
  to: string,
  date: string,
  direction: Slice['direction'],
  cabin: CabinClass,
  domestic: boolean,
): SliceOption[] {
  const out: SliceOption[] = [];
  buildPaths(al, from, to).forEach((legs, pi) => {
    const pathKey = legs.map((l) => `${l.carrier}:${l.from}${l.to}`).join('-');
    const r = createRng(`freq|${pathKey}|${date}`);
    const longHaul = legs.some((l) => distanceKm(l.from, l.to) > 5500);
    const maxN = longHaul ? (r.chance(0.3) ? 2 : 1) : legs.length === 1 ? 3 : 2;
    const n = r.int(1, maxN);
    for (let k = 0; k < n; k++) {
      const seed = `sch|${pathKey}|${date}|${k}`;
      const { slice, depMinuteOfDay } = scheduleSlice(legs, date, direction, seed, k);
      const base = basePricePerAdult(al, legs, date, depMinuteOfDay, cabin, domestic, createRng(`price|${seed}|${cabin}`));
      out.push({ slice, legs, base, key: `${pi}${k}` });
    }
  });
  return out.sort((a, b) => a.base - b.base);
}

export interface MockResult {
  offers: FlightOffer[];
  notes: string[];
}

export function mockCashOffers(params: SearchParams): MockResult {
  const offers: FlightOffer[] = [];
  const notes: string[] = [];
  const o = getAirport(params.origin);
  const d = getAirport(params.destination);
  if (!o || !d) return { offers, notes: ['Aeroporto não reconhecido pelo motor de simulação.'] };
  const domestic = o.country === 'BR' && d.country === 'BR';
  const roundtrip = params.tripType === 'roundtrip' && !!params.returnDate;
  const pax = params.adults + params.children;

  for (const code of params.airlines) {
    const al = getAirline(code);
    if (!al) continue;
    if (!al.cabins.includes(params.cabin)) {
      notes.push(`${al.shortName} não oferece a cabine ${CABIN_SHORT[params.cabin]} nesta rota.`);
      continue;
    }
    const outs = sliceOptions(al, o.code, d.code, params.departDate, 'outbound', params.cabin, domestic);
    const ins = roundtrip
      ? sliceOptions(al, d.code, o.code, params.returnDate!, 'inbound', params.cabin, domestic)
      : [];
    if (!outs.length || (roundtrip && !ins.length)) {
      notes.push(`${al.shortName} não possui tarifas para ${o.code}-${d.code} nas datas pesquisadas.`);
      continue;
    }

    const brandRng = createRng(`brands|${al.code}|${o.code}${d.code}|${params.departDate}|${params.cabin}`);
    const brands = brandsFor(al, params.cabin, domestic, brandRng);
    const childFactor = domestic ? 0.9 : 0.75;

    const combos: { out: SliceOption; inn?: SliceOption }[] = [];
    if (roundtrip) {
      outs.slice(0, 3).forEach((out) => ins.slice(0, 2).forEach((inn) => combos.push({ out, inn })));
    } else {
      outs.slice(0, 4).forEach((out) => combos.push({ out }));
    }

    for (const { out, inn } of combos) {
      for (const brand of brands) {
        const rt = inn ? 0.97 : 1;
        const perAdult = cents((out.base + (inn?.base ?? 0)) * brand.mult * rt);
        const perChild = cents(perAdult * childFactor);
        const total = cents(perAdult * params.adults + perChild * params.children);
        const slices = inn ? [out.slice, inn.slice] : [out.slice];
        const seatsRng = createRng(`seats|${al.code}|${out.key}|${inn?.key ?? ''}|${brand.name}`);
        const seats = seatsRng.chance(0.4) ? seatsRng.int(Math.min(pax, 9), 9) : undefined;
        offers.push({
          id: `mock-${al.code}-${params.departDate}-${out.key}-${inn?.key ?? 'x'}-${brand.name.replace(/\s/g, '')}`,
          provider: 'mock',
          simulated: true,
          isAward: false,
          airline: al.code,
          airlineName: al.name,
          slices,
          cabin: params.cabin,
          fareBrand: brand.name,
          bookingClass: brand.bookingClass,
          baggage: brand.baggage,
          currency: 'BRL',
          totalPrice: total,
          pricePerAdult: perAdult,
          pricePerChild: params.children ? perChild : undefined,
          totalDurationMin: slices.reduce((s, x) => s + x.durationMin, 0),
          seatsRemaining: seats,
          sortPrice: total,
        });
      }
    }
  }
  return { offers, notes };
}

// ---------------------------------------------------------------------------
// Ofertas award (Seats.aero simulado)
// ---------------------------------------------------------------------------

function awardMilesPerPax(gc: number, domestic: boolean, cabin: CabinClass, prog: LoyaltyProgram, rng: Rng): number {
  let base: number;
  if (domestic) base = rng.range(7000, 26000);
  else if (gc < 3000) base = rng.range(14000, 32000);
  else if (gc < 7000) base = rng.range(28000, 58000);
  else if (gc < 11000) base = rng.range(38000, 92000);
  else base = rng.range(60000, 120000);
  const mult: Record<CabinClass, number> = { economy: 1, premium_economy: 1.6, business: 2.7, first: 3.9 };
  return Math.max(3000, Math.round((base * mult[cabin] * prog.factor) / 500) * 500);
}

function awardTaxesPerPax(gc: number, domestic: boolean, prog: LoyaltyProgram, direction: Slice['direction'], rng: Rng) {
  if (domestic) return rng.range(32, 68);
  const fromEurope = direction === 'inbound';
  if (prog.highTaxes) return gc > 7000 ? rng.range(fromEurope ? 1100 : 750, fromEurope ? 2100 : 1400) : rng.range(280, 650);
  return gc > 7000 ? rng.range(170, 520) : rng.range(90, 330);
}

interface AwardSlice {
  slice: Slice;
  carrier: string;
  milesPerPax: number;
  taxesPerPax: number;
  seats: number;
}

function awardSlice(
  prog: LoyaltyProgram,
  partner: Airline,
  from: string,
  to: string,
  date: string,
  direction: Slice['direction'],
  cabin: CabinClass,
): AwardSlice | null {
  const legs = buildPaths(partner, from, to)[0];
  if (!legs) return null;
  const pathKey = legs.map((l) => `${l.carrier}:${l.from}${l.to}`).join('-');
  const rng = createRng(`award|${prog.id}|${pathKey}|${date}|${cabin}`);
  const availP: Record<CabinClass, number> = { economy: 0.62, premium_economy: 0.35, business: 0.4, first: 0.22 };
  if (!rng.chance(availP[cabin])) return null;
  const { slice } = scheduleSlice(legs, date, direction, `sch|${pathKey}|${date}|0`, 0);
  const gc = distanceKm(from, to);
  const domestic = getAirport(from)?.country === 'BR' && getAirport(to)?.country === 'BR';
  return {
    slice,
    carrier: partner.code,
    milesPerPax: awardMilesPerPax(gc, domestic, cabin, prog, rng),
    taxesPerPax: cents(awardTaxesPerPax(gc, domestic, prog, direction, rng)),
    seats: rng.int(1, 9),
  };
}

export function mockAwardOffers(params: SearchParams, milheiro: number): MockResult {
  const offers: FlightOffer[] = [];
  const notes: string[] = [];
  const pax = params.adults + params.children;
  const roundtrip = params.tripType === 'roundtrip' && !!params.returnDate;
  const domestic = getAirport(params.origin)?.country === 'BR' && getAirport(params.destination)?.country === 'BR';

  for (const prog of LOYALTY_PROGRAMS) {
    const partners = prog.partners
      .map((c) => getAirline(c))
      .filter((a): a is Airline => !!a && a.cabins.includes(params.cabin));
    const outs = partners
      .map((p) => awardSlice(prog, p, params.origin, params.destination, params.departDate, 'outbound', params.cabin))
      .filter((x): x is AwardSlice => !!x && x.seats >= pax)
      .slice(0, 2);
    if (!outs.length) continue;
    const ins = roundtrip
      ? partners
          .map((p) => awardSlice(prog, p, params.destination, params.origin, params.returnDate!, 'inbound', params.cabin))
          .filter((x): x is AwardSlice => !!x && x.seats >= pax)
          .slice(0, 1)
      : [];
    if (roundtrip && !ins.length) continue;

    for (const out of outs) {
      const parts = roundtrip ? [out, ins[0]] : [out];
      const milesPerPax = parts.reduce((s, p) => s + p.milesPerPax, 0);
      const taxesPerPax = cents(parts.reduce((s, p) => s + p.taxesPerPax, 0));
      const seats = Math.min(...parts.map((p) => p.seats));
      const pointsTotal = milesPerPax * pax;
      const taxesTotal = cents(taxesPerPax * pax);
      const equivalent = cents(taxesTotal + (pointsTotal / 1000) * milheiro);
      const slices = parts.map((p) => p.slice);
      const al = getAirline(out.carrier)!;
      const cabinBag: Baggage =
        params.cabin === 'economy'
          ? bag(10, domestic ? 0 : 1, domestic ? null : 23)
          : params.cabin === 'premium_economy'
            ? bag(10, 2, 23)
            : bag(12, params.cabin === 'first' ? 3 : 2, 32);
      offers.push({
        id: `award-${prog.id}-${out.carrier}-${params.departDate}-${params.returnDate ?? 'ow'}`,
        provider: 'seats.aero',
        simulated: true,
        isAward: true,
        airline: out.carrier,
        airlineName: al.name,
        slices,
        cabin: params.cabin,
        fareBrand: `Resgate ${CABIN_SHORT[params.cabin]} · ${prog.name}`,
        baggage: cabinBag,
        currency: 'BRL',
        totalPrice: taxesTotal,
        pricePerAdult: taxesPerPax,
        miles: {
          program: prog.name,
          programId: prog.id,
          pointsPerPassenger: milesPerPax,
          pointsTotal,
          taxesPerPassenger: taxesPerPax,
          taxesTotal,
          taxesCurrency: 'BRL',
          seatsRemaining: seats,
          equivalentBRL: equivalent,
        },
        totalDurationMin: slices.reduce((s, x) => s + x.durationMin, 0),
        seatsRemaining: seats,
        sortPrice: equivalent,
      });
    }
  }
  if (!offers.length) notes.push('Nenhuma disponibilidade award encontrada no Seats.aero para estas datas.');
  return { offers, notes };
}
