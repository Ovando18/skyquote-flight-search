'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { Check, Crown, PlaneLanding, PlaneTakeoff, Radar, Trophy } from 'lucide-react';
import type { FlexDirection, FlightOffer } from '@/lib/types';
import { airlineName, getAirline } from '@/lib/airlines';
import { airportCity } from '@/lib/airports';
import { duration, money, points, shortDate, stopsLabel, time } from '@/lib/format';
import { AirlineBadge } from './AirlineBadge';

interface Props {
  data: FlexDirection;
  selected: Set<string>;
  onToggle: (o: FlightOffer) => void;
}

const colLabel = (k: string) => (k === 'SEATS' ? 'Seats.aero' : (getAirline(k)?.shortName ?? k));

function compactMoney(v: number) {
  return money(v).replace(/,\d{2}$/, '');
}

function compactMiles(v: number) {
  return v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : String(v);
}

export default function FlexResults({ data, selected, onToggle }: Props) {
  const isOut = data.direction === 'outbound';

  const { all, cashMin, cashMax, best, dayBest } = useMemo(() => {
    const all = data.rows.flatMap((r) => Object.entries(r.cells).map(([k, o]) => ({ date: r.date, key: k, o })));
    const cash = all.filter((x) => !x.o.isAward).map((x) => x.o.sortPrice);
    const dayBest = new Map<string, FlightOffer>();
    for (const r of data.rows) {
      const cells = Object.values(r.cells);
      if (cells.length) dayBest.set(r.date, cells.reduce((a, b) => (b.sortPrice < a.sortPrice ? b : a)));
    }
    return {
      all,
      cashMin: cash.length ? Math.min(...cash) : 0,
      cashMax: cash.length ? Math.max(...cash) : 0,
      best: [...all].sort((a, b) => a.o.sortPrice - b.o.sortPrice).slice(0, 6),
      dayBest,
    };
  }, [data]);

  const dayVals = Array.from(dayBest.values()).map((o) => o.sortPrice);
  const dMin = dayVals.length ? Math.min(...dayVals) : 0;
  const dMax = dayVals.length ? Math.max(...dayVals) : 0;
  const heat = (v: number, min: number, max: number) => (max > min ? (v - min) / (max - min) : 0);
  const overall = best[0];
  const pax = overall?.o.passengers ? overall.o.passengers.adults + overall.o.passengers.children : 1;

  if (!all.length) {
    return (
      <section className="panel p-6 text-center text-sm text-ink-muted">
        Nenhuma opção encontrada para {data.from} → {data.to} no período.
      </section>
    );
  }

  return (
    <section className="panel overflow-hidden">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
        <span
          className={clsx(
            'grid h-11 w-11 place-items-center rounded-xl border',
            isOut ? 'border-horizon/40 bg-horizon/10 text-horizon' : 'border-violet-400/40 bg-violet-400/10 text-violet-300',
          )}
        >
          {isOut ? <PlaneTakeoff className="h-5 w-5" /> : <PlaneLanding className="h-5 w-5" />}
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Melhores valores de {isOut ? 'ida' : 'volta'}
          </div>
          <div className="font-mono text-lg font-bold text-ink">
            {data.from} <span className="text-horizon">→</span> {data.to}
            <span className="ml-2 font-sans text-xs font-normal text-ink-muted">
              {airportCity(data.from)} para {airportCity(data.to)}
            </span>
          </div>
        </div>
        {overall && (
          <div className="ml-auto rounded-xl border border-instrument/50 bg-instrument/10 px-4 py-2 text-right">
            <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-instrument">
              <Trophy className="h-3 w-3" /> Menor valor do período
            </div>
            <div className="font-mono text-base font-extrabold text-ink">
              {overall.o.isAward && overall.o.miles
                ? `${points(overall.o.miles.pointsPerPassenger)} mi + ${money(overall.o.miles.taxesPerPassenger)}`
                : money(overall.o.pricePerAdult, overall.o.currency)}
            </div>
            <div className="text-[11px] capitalize text-ink-muted">
              {shortDate(overall.date)} · {overall.key === 'SEATS' ? `Seats.aero (${overall.o.miles?.program})` : airlineName(overall.key)}
            </div>
          </div>
        )}
      </header>

      {/* Calendário de preços (melhor do dia) */}
      <div className="border-b border-line px-5 py-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Calendário · melhor valor por adulto em cada data
        </div>
        <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-2">
          {data.rows.map((r) => {
            const o = dayBest.get(r.date);
            const t = o ? heat(o.sortPrice, dMin, dMax) : 1;
            const sel = o && selected.has(o.id);
            const isMin = o && o.sortPrice === dMin;
            return (
              <button
                key={r.date}
                type="button"
                disabled={!o}
                onClick={() => o && onToggle(o)}
                title={o ? `${o.airlineName} · ${stopsLabel(o.slices[0])} · clique para selecionar` : 'Sem voos'}
                className={clsx(
                  'relative flex w-[74px] shrink-0 flex-col items-center rounded-lg border px-1 py-2 transition',
                  sel ? 'border-instrument bg-instrument/20' : isMin ? 'border-instrument/60' : 'border-line hover:border-line-strong',
                  !o && 'opacity-30',
                )}
                style={!sel && o ? { background: `rgba(16,185,129,${(0.32 * (1 - t)).toFixed(3)})` } : undefined}
              >
                {isMin && <Crown className="absolute -top-2 h-3.5 w-3.5 text-instrument" />}
                <span className="text-[10px] capitalize text-ink-muted">{shortDate(r.date).split(',')[0]}</span>
                <span className="font-mono text-sm font-bold text-ink">{r.date.slice(8, 10)}/{r.date.slice(5, 7)}</span>
                <span className={clsx('mt-0.5 font-mono text-[10px] font-semibold', t < 0.25 ? 'text-radar' : 'text-ink-muted')}>
                  {o ? (o.isAward && o.miles ? `${compactMiles(o.miles.pointsPerPassenger)} mi` : compactMoney(o.pricePerAdult)) : '—'}
                </span>
                {o && <AirlineBadge code={o.airline} size="sm" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Top 6 */}
      <div className="grid gap-2 border-b border-line px-5 py-4 sm:grid-cols-2 xl:grid-cols-3">
        {best.map(({ date, key, o }, i) => {
          const s = o.slices[0];
          const sel = selected.has(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o)}
              className={clsx(
                'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                sel ? 'border-instrument bg-instrument/10 shadow-amber' : 'border-line bg-cockpit-800/50 hover:border-line-strong',
              )}
            >
              <span className="w-5 font-mono text-xs font-bold text-ink-faint">{i + 1}º</span>
              <AirlineBadge code={o.airline} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold capitalize text-ink">
                  {shortDate(date)} · {key === 'SEATS' ? 'Seats.aero' : o.airlineName}
                </span>
                <span className="block truncate font-mono text-[11px] text-ink-muted">
                  {time(s.segments[0].departure)} → {time(s.segments[s.segments.length - 1].arrival)} · {duration(s.durationMin)} ·{' '}
                  {stopsLabel(s)}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-mono text-sm font-bold text-ink">
                  {o.isAward && o.miles ? `${compactMiles(o.miles.pointsPerPassenger)} mi` : money(o.pricePerAdult, o.currency)}
                </span>
                <span className="block text-[10px] text-ink-faint">{o.isAward ? `+ ${money(o.miles?.taxesPerPassenger ?? 0)}` : 'por adulto'}</span>
              </span>
              <span
                className={clsx(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-md border',
                  sel ? 'border-instrument bg-instrument text-cockpit-900' : 'border-line-strong',
                )}
              >
                {sel && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Matriz data x companhia */}
      <div className="px-5 pb-5 pt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Por data e companhia</span>
          <span className="text-[11px] text-ink-faint">
            Valores somente {isOut ? 'ida' : 'volta'}, por adulto, taxas incluídas · {pax} passageiro(s) no total · clique para selecionar
          </span>
        </div>
        <div className="scrollbar-thin max-h-[520px] overflow-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-panel-2">
              <tr>
                <th className="sticky left-0 z-20 bg-panel-2 px-3 py-2 text-left font-semibold text-ink-muted">Data</th>
                {data.columns.map((k) => (
                  <th key={k} className="whitespace-nowrap px-2 py-2 font-semibold text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      {k === 'SEATS' ? <Radar className="h-4 w-4 text-instrument" /> : <AirlineBadge code={k} size="sm" />}
                      {colLabel(k)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const rowCash = Object.values(r.cells).filter((o) => !o.isAward);
                const rowMin = rowCash.length ? Math.min(...rowCash.map((o) => o.sortPrice)) : -1;
                return (
                  <tr key={r.date} className="border-t border-line/70">
                    <td className="sticky left-0 z-[5] whitespace-nowrap bg-panel px-3 py-1.5 font-mono font-semibold capitalize text-ink">
                      {shortDate(r.date)}
                    </td>
                    {data.columns.map((k) => {
                      const o = r.cells[k];
                      if (!o)
                        return (
                          <td key={k} className="px-2 py-1.5 text-center text-ink-faint/40">
                            —
                          </td>
                        );
                      const sel = selected.has(o.id);
                      const t = o.isAward ? 1 : heat(o.sortPrice, cashMin, cashMax);
                      const isRowMin = !o.isAward && o.sortPrice === rowMin;
                      const isGlobal = !o.isAward && o.sortPrice === cashMin;
                      return (
                        <td key={k} className="p-1">
                          <button
                            type="button"
                            onClick={() => onToggle(o)}
                            title={`${o.slices[0].segments.map((g) => g.flightNumber).join(' / ')} · ${time(o.slices[0].segments[0].departure)} · ${stopsLabel(o.slices[0])}`}
                            className={clsx(
                              'relative w-full min-w-[86px] rounded-md border px-1.5 py-1 text-center transition',
                              sel
                                ? 'border-instrument bg-instrument/25'
                                : isGlobal
                                  ? 'border-instrument/70'
                                  : 'border-transparent hover:border-line-strong',
                            )}
                            style={!sel && !o.isAward ? { background: `rgba(16,185,129,${(0.28 * (1 - t)).toFixed(3)})` } : undefined}
                          >
                            {isGlobal && <Crown className="absolute -right-1 -top-1.5 h-3 w-3 text-instrument" />}
                            <span
                              className={clsx(
                                'block font-mono font-bold',
                                o.isAward ? 'text-instrument' : isRowMin ? 'text-radar' : 'text-ink',
                              )}
                            >
                              {o.isAward && o.miles ? `${compactMiles(o.miles.pointsPerPassenger)} mi` : compactMoney(o.pricePerAdult)}
                            </span>
                            <span className="block text-[10px] text-ink-faint">
                              {o.isAward && o.miles
                                ? `+${compactMoney(o.miles.taxesPerPassenger)}`
                                : o.slices[0].segments.length === 1
                                  ? 'direto'
                                  : `${o.slices[0].segments.length - 1} conex.`}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
