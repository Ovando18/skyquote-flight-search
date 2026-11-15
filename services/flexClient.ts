/**
 * Busca de datas flexíveis em blocos.
 * Divide cada período (ida / volta) em blocos de datas, consulta /api/flex bloco a bloco e
 * vai entregando o resultado parcial (onProgress) para a tela se preencher aos poucos.
 */
import type { ApiConfig, FlexDirection, FlexParams, FlexResponse } from '@/lib/types';
import { addDays, dayDiff } from '@/lib/time';
import { FLEX_CHUNK_LIVE, FLEX_CHUNK_SIM } from '@/lib/flexConfig';
import { runFlexSearch } from './searchClient';

export interface FlexProgress {
  done: number; // dias concluídos
  total: number; // dias totais (ida + volta)
}

interface Chunk {
  only: 'outbound' | 'inbound';
  start: string;
  end: string;
  days: number;
}

export function flexTotalDays(p: FlexParams): number {
  const out = dayDiff(p.outStart, p.outEnd) + 1;
  const ret = p.tripType === 'roundtrip' && p.retStart && p.retEnd ? dayDiff(p.retStart, p.retEnd) + 1 : 0;
  return out + ret;
}

function chunks(p: FlexParams, size: number): Chunk[] {
  const list: Chunk[] = [];
  const split = (only: Chunk['only'], start: string, end: string) => {
    const total = dayDiff(start, end) + 1;
    for (let i = 0; i < total; i += size) {
      const days = Math.min(size, total - i);
      list.push({ only, start: addDays(start, i), end: addDays(start, i + days - 1), days });
    }
  };
  split('outbound', p.outStart, p.outEnd);
  if (p.tripType === 'roundtrip' && p.retStart && p.retEnd) split('inbound', p.retStart, p.retEnd);
  return list;
}

function mergeDirection(acc: FlexDirection | undefined, add: FlexDirection | undefined): FlexDirection | undefined {
  if (!add) return acc;
  if (!acc) return { ...add, rows: [...add.rows] };
  const rows = [...acc.rows, ...add.rows].sort((a, b) => a.date.localeCompare(b.date));
  // Colunas: ordenadas pelo menor valor encontrado em todo o período; Seats.aero por último
  const min = new Map<string, number>();
  for (const r of rows)
    for (const [k, o] of Object.entries(r.cells)) min.set(k, Math.min(min.get(k) ?? Infinity, o.sortPrice));
  const columns = Array.from(min.entries())
    .sort((a, b) => (a[0] === 'SEATS' ? 1 : b[0] === 'SEATS' ? -1 : a[1] - b[1]))
    .map(([k]) => k);
  return { ...acc, rows, columns };
}

export async function runFlexChunked(
  params: FlexParams,
  config: ApiConfig,
  onProgress: (partial: FlexResponse, progress: FlexProgress) => void,
  signal?: { cancelled: boolean },
): Promise<FlexResponse> {
  const size = config.mode === 'live' ? FLEX_CHUNK_LIVE : FLEX_CHUNK_SIM;
  const list = chunks(params, size);
  const total = list.reduce((s, c) => s + c.days, 0);
  let result: FlexResponse = { warnings: [], params, searchedAt: new Date().toISOString() };
  let done = 0;

  for (const c of list) {
    if (signal?.cancelled) break;
    const p: FlexParams =
      c.only === 'outbound'
        ? { ...params, only: 'outbound', outStart: c.start, outEnd: c.end }
        : { ...params, only: 'inbound', retStart: c.start, retEnd: c.end };
    const r = await runFlexSearch(p, config);
    result = {
      ...result,
      outbound: mergeDirection(result.outbound, r.outbound),
      inbound: mergeDirection(result.inbound, r.inbound),
      warnings: Array.from(new Set([...result.warnings, ...r.warnings])),
      searchedAt: r.searchedAt,
    };
    done += c.days;
    onProgress(result, { done, total });
  }
  return result;
}
