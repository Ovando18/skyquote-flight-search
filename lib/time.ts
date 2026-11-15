/** Utilitários de data/hora com fuso IANA (sem dependências externas). */

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function dtf(tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    dtfCache.set(tz, f);
  }
  return f;
}

function parts(utcMs: number, tz: string) {
  const p: Record<string, string> = {};
  for (const x of dtf(tz).formatToParts(new Date(utcMs))) p[x.type] = x.value;
  return {
    y: +p.year,
    mo: +p.month,
    d: +p.day,
    h: +p.hour === 24 ? 0 : +p.hour,
    mi: +p.minute,
  };
}

/** Offset do fuso em minutos (local - UTC) no instante informado */
export function tzOffsetMin(tz: string, utcMs: number): number {
  const p = parts(utcMs, tz);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  return Math.round((asUtc - Math.floor(utcMs / 60000) * 60000) / 60000);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** UTC (ms) -> "YYYY-MM-DDTHH:mm" no fuso local */
export function utcToLocal(utcMs: number, tz: string): string {
  const p = parts(utcMs, tz);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** "YYYY-MM-DDTHH:mm" local -> UTC (ms) */
export function localToUtc(local: string, tz: string): number {
  const guess = naiveMs(local);
  const off1 = tzOffsetMin(tz, guess);
  let utc = guess - off1 * 60000;
  const off2 = tzOffsetMin(tz, utc);
  if (off2 !== off1) utc = guess - off2 * 60000;
  return utc;
}

/** Interpreta uma data/hora local como se fosse UTC (útil para diferenças no mesmo fuso) */
export function naiveMs(local: string): number {
  const [d, t = '00:00'] = local.split('T');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  return Date.UTC(y, mo - 1, da, h || 0, mi || 0);
}

export function diffMinutesNaive(a: string, b: string): number {
  return Math.round((naiveMs(b) - naiveMs(a)) / 60000);
}

/** Diferença em dias de calendário entre duas datas "YYYY-MM-DD..." */
export function dayDiff(fromDate: string, toDate: string): number {
  return Math.round((naiveMs(toDate.slice(0, 10)) - naiveMs(fromDate.slice(0, 10))) / 86400000);
}

export function addDays(date: string, days: number): string {
  const ms = naiveMs(date.slice(0, 10)) + days * 86400000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Normaliza strings de data/hora de provedores para "YYYY-MM-DDTHH:mm" */
export function normalizeLocal(s: string): string {
  const m = s.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : s;
}

/** Duração ISO-8601 (PT12H35M / P1DT2H) -> minutos */
export function isoDurationToMin(iso?: string | null): number {
  if (!iso) return 0;
  const m = iso.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  if (!m) return 0;
  return (+(m[1] ?? 0)) * 1440 + (+(m[2] ?? 0)) * 60 + (+(m[3] ?? 0));
}
