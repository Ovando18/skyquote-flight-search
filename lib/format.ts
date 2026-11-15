import type { Baggage, FlightOffer, Slice } from './types';
import { dayDiff } from './time';

const fmtCache = new Map<string, Intl.NumberFormat>();

export function money(value: number, currency = 'BRL'): string {
  let f = fmtCache.get(currency);
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { style: 'currency', currency, minimumFractionDigits: 2 });
    fmtCache.set(currency, f);
  }
  // Normaliza espaços não separáveis (melhor compatibilidade com o PDF)
  return f.format(value).replace(/ | /g, ' ');
}

export function points(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

export function duration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

export function time(local: string): string {
  return local.slice(11, 16);
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function shortDate(local: string): string {
  const [y, m, d] = local.slice(0, 10).split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[wd]}, ${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

export function brDate(local: string): string {
  const [y, m, d] = local.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function brDateTime(local: string): string {
  return `${brDate(local)} ${time(local)}`;
}

/** "+1" / "+2" quando a chegada é em dia posterior à partida */
export function dayOffset(depLocal: string, arrLocal: string): number {
  return dayDiff(depLocal, arrLocal);
}

export function stopsLabel(slice: Slice): string {
  const n = slice.segments.length - 1;
  if (n <= 0) return 'Voo direto';
  return n === 1 ? '1 conexão' : `${n} conexões`;
}

export function baggageText(b: Baggage): string {
  if (b.note) return b.note;
  const parts: string[] = [];
  if (b.personalItem) parts.push('1 item pessoal');
  if (b.carryOnKg) parts.push(`1 bagagem de mão ${b.carryOnKg}kg`);
  if (b.checkedBags > 0)
    parts.push(
      `${b.checkedBags} bagage${b.checkedBags > 1 ? 'ns' : 'm'} despachada${b.checkedBags > 1 ? 's' : ''}${
        b.checkedKg ? ` ${b.checkedKg}kg` : ''
      }`,
    );
  return parts.join(' + ') || 'Consulte a franquia da tarifa';
}

export function flightNumbers(offer: FlightOffer): string {
  return offer.slices.map((s) => s.segments.map((g) => g.flightNumber).join(' / ')).join('  |  ');
}

export function passengersLabel(adults: number, children: number): string {
  const a = `${adults} adulto${adults > 1 ? 's' : ''}`;
  if (!children) return a;
  return `${a} / ${children} criança${children > 1 ? 's' : ''}`;
}
