/**
 * Busca de datas flexíveis
 * ------------------------
 * Varre uma janela de datas para a ida (e outra para a volta) com buscas "somente ida"
 * e devolve, para cada data, a melhor oferta de cada companhia (+ melhor resgate Seats.aero).
 *
 * Cada requisição cobre um bloco de datas (até 31 dias na simulação / 15 ao vivo).
 * Períodos maiores (até FLEX_MAX_PERIOD_DAYS) são divididos em blocos pelo cliente
 * (services/flexClient.ts), o que evita estourar o tempo limite das funções na hospedagem.
 */
import type { ApiConfig, FlexDirection, FlexParams, FlexResponse, FlightOffer, SearchParams } from '@/lib/types';
import { addDays, dayDiff } from '@/lib/time';
import { searchFlights } from './flightSearch';

export const FLEX_MAX_DAYS_SIM = 31;
export const FLEX_MAX_DAYS_LIVE = 15;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateFlex(p: FlexParams): string | null {
  if (!p || typeof p !== 'object') return 'Parâmetros inválidos.';
  if (!/^[A-Z]{3}$/.test(p.origin ?? '') || !/^[A-Z]{3}$/.test(p.destination ?? ''))
    return 'Informe aeroportos de origem e destino válidos (código IATA).';
  if (p.origin === p.destination) return 'Origem e destino devem ser diferentes.';
  if (p.only !== 'inbound') {
    if (!DATE_RE.test(p.outStart ?? '') || !DATE_RE.test(p.outEnd ?? '')) return 'Informe o período de ida.';
    if (p.outEnd < p.outStart) return 'No período de ida, a data final deve ser posterior à inicial.';
  }
  if (p.tripType === 'roundtrip' || p.only === 'inbound') {
    if (!DATE_RE.test(p.retStart ?? '') || !DATE_RE.test(p.retEnd ?? '')) return 'Informe o período de volta.';
    if (p.retEnd! < p.retStart!) return 'No período de volta, a data final deve ser posterior à inicial.';
  }
  if (!(p.adults >= 1 && p.adults + (p.children ?? 0) <= 9)) return 'Quantidade de passageiros inválida (máximo 9).';
  return null;
}

function dateRange(start: string, end: string, max: number): { dates: string[]; truncated: boolean } {
  const n = dayDiff(start, end) + 1;
  const len = Math.min(n, max);
  return { dates: Array.from({ length: len }, (_, i) => addDays(start, i)), truncated: n > max };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

async function scanDirection(
  p: FlexParams,
  config: Partial<ApiConfig>,
  direction: 'outbound' | 'inbound',
  warnings: string[],
): Promise<FlexDirection> {
  const live = config.mode === 'live';
  const from = direction === 'outbound' ? p.origin : p.destination;
  const to = direction === 'outbound' ? p.destination : p.origin;
  const start = direction === 'outbound' ? p.outStart : p.retStart!;
  const end = direction === 'outbound' ? p.outEnd : p.retEnd!;
  const max = live ? FLEX_MAX_DAYS_LIVE : FLEX_MAX_DAYS_SIM;
  const { dates, truncated } = dateRange(start, end, max);
  if (truncated)
    warnings.push(
      `${direction === 'outbound' ? 'Ida' : 'Volta'}: período limitado a ${max} dias (${dates[0]} a ${dates[dates.length - 1]})${
        live ? ' para preservar créditos das APIs' : ''
      }.`,
    );

  const results = await mapLimit(dates, live ? 3 : 8, async (date) => {
    const sp: SearchParams = {
      tripType: 'oneway',
      origin: from,
      destination: to,
      departDate: date,
      adults: p.adults,
      children: p.children,
      cabin: p.cabin,
      airlines: [],
      includeCash: true,
      includeSeatsAero: p.includeSeatsAero,
    };
    const r = await searchFlights(sp, config);
    r.warnings.filter((w) => !/Nenhuma disponibilidade award/.test(w)).forEach((w) => warnings.push(w));
    return { date, offers: r.offers };
  });

  const colMin = new Map<string, number>();
  const rows = results.map(({ date, offers }) => {
    const cells: Record<string, FlightOffer> = {};
    for (const o of offers) {
      const key = o.isAward ? 'SEATS' : o.airline;
      if (!cells[key] || o.sortPrice < cells[key].sortPrice) cells[key] = o;
    }
    for (const [k, o] of Object.entries(cells)) {
      if (direction === 'inbound') o.slices = o.slices.map((s) => ({ ...s, direction: 'inbound' }));
      o.id = `flex-${direction}-${date}-${k}-${o.id}`;
      colMin.set(k, Math.min(colMin.get(k) ?? Infinity, o.sortPrice));
    }
    return { date, cells };
  });

  // Colunas ordenadas pelo menor valor encontrado; Seats.aero sempre por último
  const columns = Array.from(colMin.entries())
    .sort((a, b) => (a[0] === 'SEATS' ? 1 : b[0] === 'SEATS' ? -1 : a[1] - b[1]))
    .map(([k]) => k);

  return { direction, from, to, columns, rows };
}

export async function searchFlex(p: FlexParams, config: Partial<ApiConfig>): Promise<FlexResponse> {
  const warnings: string[] = [];
  const outbound = p.only === 'inbound' ? undefined : await scanDirection(p, config, 'outbound', warnings);
  const inbound =
    p.only === 'inbound' || (p.tripType === 'roundtrip' && p.only !== 'outbound')
      ? await scanDirection(p, config, 'inbound', warnings)
      : undefined;
  return {
    outbound,
    inbound,
    warnings: Array.from(new Set(warnings)),
    params: p,
    searchedAt: new Date().toISOString(),
  };
}
