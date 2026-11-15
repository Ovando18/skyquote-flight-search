import type { Layover, Segment, Slice } from '@/lib/types';
import { diffMinutesNaive, localToUtc } from '@/lib/time';
import { getAirport } from '@/lib/airports';

/** Monta um Slice a partir de segmentos, calculando conexões e duração quando necessário. */
export function buildSlice(
  direction: Slice['direction'],
  segments: Segment[],
  totalDurationMin?: number,
  layoverOverrides?: Partial<Layover>[],
): Slice {
  const layovers: Layover[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i];
    const b = segments[i + 1];
    const dur = layoverOverrides?.[i]?.durationMin ?? diffMinutesNaive(a.arrival, b.departure);
    layovers.push({
      airport: layoverOverrides?.[i]?.airport ?? a.to,
      durationMin: Math.max(0, dur),
      overnight: layoverOverrides?.[i]?.overnight ?? a.arrival.slice(0, 10) !== b.departure.slice(0, 10),
    });
  }
  let durationMin = totalDurationMin ?? 0;
  if (!durationMin && segments.length) {
    const first = segments[0];
    const last = segments[segments.length - 1];
    const fa = getAirport(first.from);
    const la = getAirport(last.to);
    if (fa && la) {
      durationMin = Math.round(
        (localToUtc(last.arrival, la.tz) - localToUtc(first.departure, fa.tz)) / 60000,
      );
    } else {
      durationMin =
        segments.reduce((s, g) => s + g.durationMin, 0) + layovers.reduce((s, l) => s + l.durationMin, 0);
    }
  }
  return { direction, segments, layovers, durationMin };
}

/** Câmbio aproximado apenas para ordenar ofertas em moedas diferentes */
export const FX_TO_BRL: Record<string, number> = {
  BRL: 1,
  USD: 5.4,
  EUR: 5.9,
  GBP: 6.9,
  CAD: 3.9,
  AUD: 3.5,
  CHF: 6.2,
  ARS: 0.0055,
  CLP: 0.0058,
};

export function toBRL(value: number, currency: string): number {
  return value * (FX_TO_BRL[currency?.toUpperCase()] ?? 1);
}

export async function fetchJson<T = unknown>(url: string, init?: RequestInit, timeoutMs = 25000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!res.ok) {
      const msg =
        typeof body === 'object' && body !== null
          ? JSON.stringify(body).slice(0, 300)
          : String(body).slice(0, 300);
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }
    return body as T;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Tempo limite excedido');
    throw e;
  } finally {
    clearTimeout(t);
  }
}
