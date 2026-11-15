import type { FlightOffer, SearchParams } from './types';

const firstDep = (o: FlightOffer) => o.slices[0].segments[0].departure;

/** Reconstrói os dados da viagem a partir das ofertas escolhidas (busca normal ou datas flexíveis). */
/** Ordena ida antes da volta (respeitando o sentido informado) e, depois, por data */
export function sortForTrip(offers: FlightOffer[]): FlightOffer[] {
  const rank = (o: FlightOffer) => (o.slices[0].direction === 'inbound' ? 1 : 0);
  return [...offers].sort((a, b) => rank(a) - rank(b) || firstDep(a).localeCompare(firstDep(b)));
}

/** Volta marcada para antes da chegada da ida */
export function hasDateConflict(offers: FlightOffer[]): boolean {
  const slices = sortForTrip(offers).flatMap((o) => o.slices);
  for (let i = 1; i < slices.length; i++) {
    const prev = slices[i - 1].segments[slices[i - 1].segments.length - 1].arrival;
    if (slices[i].segments[0].departure.slice(0, 10) < prev.slice(0, 10)) return true;
  }
  return false;
}

export function deriveTrip(offers: FlightOffer[]): SearchParams {
  const sorted = sortForTrip(offers);
  const first = sorted[0];
  const s0 = first.slices[0];
  const origin = s0.segments[0].from;
  const destination = s0.segments[s0.segments.length - 1].to;
  const inbound = sorted.flatMap((o) => o.slices).find((s) => s.direction === 'inbound' || s.segments[0].from === destination);
  const pax = first.passengers ?? { adults: 1, children: 0 };
  return {
    tripType: inbound ? 'roundtrip' : 'oneway',
    origin,
    destination,
    departDate: s0.segments[0].departure.slice(0, 10),
    returnDate: inbound?.segments[0].departure.slice(0, 10),
    adults: pax.adults,
    children: pax.children,
    cabin: first.cabin,
    airlines: [],
    includeSeatsAero: offers.some((o) => o.isAward),
  };
}

/** Custo de referência em R$ (tarifa total ou, para milhas, equivalente milhas x milheiro + taxas) */
export function offerCostBRL(o: FlightOffer): number {
  return Math.round((o.isAward && o.miles ? o.miles.equivalentBRL : o.sortPrice) * 100) / 100;
}

/** Seleção padrão do orçamento: melhor ida + melhor volta (quando há trechos avulsos) ou a opção mais barata */
export function defaultBudgetSelection(offers: FlightOffer[]): string[] {
  if (!offers.length) return [];
  const byPrice = [...offers].sort((a, b) => a.sortPrice - b.sortPrice);
  const origin = deriveTrip(offers).origin;
  const startsAtOrigin = (o: FlightOffer) => o.slices[0].direction !== 'inbound' && o.slices[0].segments[0].from === origin;
  const lastArrival = (o: FlightOffer) => {
    const s = o.slices[o.slices.length - 1];
    return s.segments[s.segments.length - 1].arrival.slice(0, 10);
  };

  // Melhor ida avulsa + melhor volta compatível (datas flexíveis)
  const out = byPrice.find((o) => o.slices.length === 1 && startsAtOrigin(o));
  const back = out
    ? byPrice.find(
        (o) =>
          o.slices.length === 1 &&
          o.slices[0].segments[0].from !== origin &&
          o.slices[0].segments[0].departure.slice(0, 10) >= lastArrival(out),
      )
    : undefined;
  const pairCost = out && back ? out.sortPrice + back.sortPrice : Infinity;

  // Melhor opção que já começa na origem (ida e volta completa ou somente ida)
  const full = byPrice.find((o) => startsAtOrigin(o) && (o.slices.length > 1 || !back));
  if (full && full.sortPrice <= pairCost) return [full.id];
  if (out && back) return [out.id, back.id];
  return [(full ?? out ?? byPrice[0]).id];
}

export function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 13);
  if (d.length > 11) return `+${d.slice(0, d.length - 11)} (${d.slice(-11, -9)}) ${d.slice(-9, -4)}-${d.slice(-4)}`;
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
