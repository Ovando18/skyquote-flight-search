'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  Armchair,
  Briefcase,
  Check,
  ChevronDown,
  Clock,
  Coins,
  Luggage,
  Moon,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Radar,
  ShoppingBag,
  Timer,
  TrendingDown,
  Zap,
} from 'lucide-react';
import type { FlightOffer, Slice } from '@/lib/types';
import { CABIN_SHORT, PROVIDER_LABELS } from '@/lib/types';
import { airportCity } from '@/lib/airports';
import { airlineName } from '@/lib/airlines';
import { baggageText, dayOffset, duration, money, points, shortDate, stopsLabel, time } from '@/lib/format';
import { AirlineBadge, SeatsAeroSeal } from './AirlineBadge';

export interface CardFlags {
  cheapest?: boolean;
  fastest?: boolean;
  promo?: boolean;
}

interface Props {
  offer: FlightOffer;
  selected: boolean;
  onToggle: () => void;
  flags: CardFlags;
  passengers: { adults: number; children: number };
  index: number;
}

function RouteLine({ slice }: { slice: Slice }) {
  const stops = slice.layovers;
  const direct = stops.length === 0;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center px-1 sm:px-2">
      <span className="mb-1 flex items-center gap-1 font-mono text-[11px] font-medium text-ink-muted">
        <Clock className="h-3 w-3" />
        {duration(slice.durationMin)}
      </span>
      <div className="relative h-5 w-full">
        <div className="route-dash absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2" />
        <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border-2 border-horizon bg-cockpit-900" />
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-horizon" />
        {direct ? (
          <Plane className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 fill-horizon/20 text-horizon" />
        ) : (
          stops.map((l, i) => {
            const left = ((i + 1) / (stops.length + 1)) * 100;
            return (
              <span
                key={i}
                className="group/stop absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${left}%` }}
                tabIndex={0}
              >
                <span className="block h-3 w-3 cursor-help rounded-full border-2 border-instrument bg-cockpit-900 transition group-hover/stop:scale-125 group-hover/stop:bg-instrument" />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-line bg-cockpit-950 px-3 py-2 text-left shadow-card group-hover/stop:block group-focus/stop:block">
                  <span className="block font-mono text-xs font-bold text-instrument">Conexão em {l.airport}</span>
                  <span className="block text-[11px] text-ink-muted">{airportCity(l.airport)}</span>
                  <span className="mt-1 flex items-center gap-1 font-mono text-[11px] text-ink">
                    <Timer className="h-3 w-3" /> Espera de {duration(l.durationMin)}
                    {l.overnight && <Moon className="ml-1 h-3 w-3 text-horizon" />}
                  </span>
                </span>
              </span>
            );
          })
        )}
      </div>
      <span
        className={clsx(
          'mt-1 text-[11px] font-semibold',
          direct ? 'text-radar' : 'text-instrument',
        )}
      >
        {stopsLabel(slice)}
        {!direct && (
          <span className="hidden font-mono font-medium text-ink-muted sm:inline"> · {stops.map((s) => s.airport).join(', ')}</span>
        )}
      </span>
    </div>
  );
}

function SliceRow({ slice }: { slice: Slice }) {
  const first = slice.segments[0];
  const last = slice.segments[slice.segments.length - 1];
  const plus = dayOffset(first.departure, last.arrival);
  const isOut = slice.direction === 'outbound';
  return (
    <div className="flex items-center gap-3">
      <div className="hidden w-[74px] shrink-0 sm:block">
        <span
          className={clsx(
            'chip',
            isOut ? 'border-horizon/40 text-horizon' : 'border-violet-400/40 text-violet-300',
          )}
        >
          {isOut ? <PlaneTakeoff className="h-3 w-3" /> : <PlaneLanding className="h-3 w-3" />}
          {isOut ? 'Ida' : 'Volta'}
        </span>
        <div className="mt-1 text-[11px] capitalize text-ink-muted">{shortDate(first.departure)}</div>
      </div>
      <div className="w-[54px] shrink-0 text-right sm:w-[76px]">
        <div className="font-mono text-lg font-bold leading-none text-ink sm:text-xl">{time(first.departure)}</div>
        <div className="iata mt-1 text-sm text-horizon" title={airportCity(first.from)}>
          {first.from}
        </div>
      </div>
      <RouteLine slice={slice} />
      <div className="w-[60px] shrink-0 sm:w-[76px]">
        <div className="font-mono text-lg font-bold leading-none text-ink sm:text-xl">
          {time(last.arrival)}
          {plus > 0 && (
            <sup className="ml-0.5 align-super font-mono text-[10px] font-bold text-instrument" title={`Chega ${plus} dia(s) depois`}>
              +{plus}
            </sup>
          )}
        </div>
        <div className="iata mt-1 text-sm text-horizon" title={airportCity(last.to)}>
          {last.to}
        </div>
      </div>
    </div>
  );
}

function SliceDetails({ slice }: { slice: Slice }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {slice.direction === 'outbound' ? <PlaneTakeoff className="h-3.5 w-3.5" /> : <PlaneLanding className="h-3.5 w-3.5" />}
        {slice.direction === 'outbound' ? 'Ida' : 'Volta'} · {shortDate(slice.segments[0].departure)} · {duration(slice.durationMin)}
      </div>
      <ol className="relative space-y-0 border-l border-dashed border-line-strong pl-5">
        {slice.segments.map((s, i) => (
          <li key={i}>
            <div className="relative pb-3">
              <span className="absolute -left-[26px] top-1 grid h-3 w-3 place-items-center rounded-full bg-horizon ring-4 ring-panel" />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <AirlineBadge code={s.carrier} size="sm" />
                <span className="font-mono text-sm font-bold text-ink">{s.flightNumber}</span>
                <span className="text-xs text-ink-muted">{airlineName(s.carrier)}</span>
                {s.operatingCarrier && (
                  <span className="text-[11px] text-ink-faint">operado por {airlineName(s.operatingCarrier)}</span>
                )}
                {s.aircraft && <span className="chip border-line text-ink-muted">{s.aircraft}</span>}
              </div>
              <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg bg-cockpit-800/70 px-3 py-2 font-mono text-xs">
                <div>
                  <span className="font-bold text-ink">{time(s.departure)}</span>{' '}
                  <span className="font-bold text-horizon">{s.from}</span>
                  <div className="truncate font-sans text-[11px] text-ink-muted">
                    {airportCity(s.from)} · <span className="capitalize">{shortDate(s.departure)}</span>
                  </div>
                </div>
                <div className="text-center text-[11px] text-ink-muted">
                  <Plane className="mx-auto h-3.5 w-3.5 rotate-45 text-horizon" />
                  {s.durationMin ? duration(s.durationMin) : ''}
                </div>
                <div className="text-right">
                  <span className="font-bold text-ink">{time(s.arrival)}</span>{' '}
                  <span className="font-bold text-horizon">{s.to}</span>
                  <div className="truncate font-sans text-[11px] text-ink-muted">
                    {airportCity(s.to)} · <span className="capitalize">{shortDate(s.arrival)}</span>
                  </div>
                </div>
              </div>
            </div>
            {slice.layovers[i] && (
              <div className="relative pb-3">
                <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-instrument bg-panel" />
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-instrument/25 bg-instrument/5 px-3 py-1.5 text-xs text-instrument">
                  <Timer className="h-3.5 w-3.5" />
                  Conexão em <b className="font-mono">{slice.layovers[i].airport}</b> ({airportCity(slice.layovers[i].airport)})
                  · espera de <b className="font-mono">{duration(slice.layovers[i].durationMin)}</b>
                  {slice.segments[i + 1] && (
                    <span className="text-ink-muted">
                      · próximo voo <b className="font-mono text-ink">{slice.segments[i + 1].flightNumber}</b>
                    </span>
                  )}
                  {slice.layovers[i].overnight && (
                    <span className="flex items-center gap-1 text-horizon">
                      <Moon className="h-3 w-3" /> pernoite
                    </span>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function FlightCard({ offer, selected, onToggle, flags, passengers, index }: Props) {
  const [open, setOpen] = useState(false);
  const pax = passengers.adults + passengers.children;
  const allNumbers = Array.from(new Set(offer.slices.flatMap((s) => s.segments.map((g) => g.flightNumber))));
  const b = offer.baggage;

  return (
    <article
      className={clsx(
        'group relative flex animate-rise flex-wrap overflow-visible rounded-2xl border bg-panel/95 shadow-card transition sm:flex-nowrap',
        selected ? 'border-instrument/80 shadow-amber' : 'border-line hover:border-line-strong',
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {/* Seleção */}
      <label
        className={clsx(
          'flex w-10 shrink-0 cursor-pointer flex-col items-center justify-start gap-2 rounded-tl-2xl border-r pt-5 transition sm:w-12 sm:rounded-l-2xl',
          selected ? 'border-instrument/40 bg-instrument/10' : 'border-line bg-cockpit-800/40 hover:bg-cockpit-800/80',
        )}
        title="Selecionar voo para orçamento"
      >
        <input type="checkbox" className="sr-only" checked={selected} onChange={onToggle} aria-label="Selecionar voo para orçamento" />
        <span
          className={clsx(
            'grid h-6 w-6 place-items-center rounded-md border-2 transition',
            selected ? 'border-instrument bg-instrument text-cockpit-900' : 'border-line-strong bg-cockpit-900 group-hover:border-ink-muted',
          )}
        >
          {selected && <Check className="h-4 w-4" strokeWidth={3} />}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-faint [writing-mode:vertical-rl] rotate-180">
          Orçamento
        </span>
      </label>

      {/* Corpo */}
      <div className="min-w-0 flex-1 basis-[calc(100%-2.5rem)] p-3.5 sm:basis-auto sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <AirlineBadge code={offer.airline} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">{offer.airlineName}</span>
              {offer.isAward && <SeatsAeroSeal />}
            </div>
            <div className="truncate font-mono text-[11px] text-ink-muted">{allNumbers.join(' · ')}</div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {offer.simulated && (
              <span className="chip border-ink-faint/40 text-ink-faint" title="Dados gerados pelo motor de simulação">
                Simulado
              </span>
            )}
            {!offer.simulated && (
              <span className="chip border-radar/40 text-radar" title={PROVIDER_LABELS[offer.provider]}>
                <Radar className="h-3 w-3" /> Ao vivo
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {offer.slices.map((s, i) => (
            <SliceRow key={i} slice={s} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <Armchair className="h-3.5 w-3.5 text-horizon" />
            <span className="text-ink">{CABIN_SHORT[offer.cabin]}</span>
            <span>· {offer.fareBrand}</span>
            {offer.bookingClass && <span className="chip border-line text-ink-muted">{offer.bookingClass}</span>}
          </span>
          <span className="flex items-center gap-1.5" title={baggageText(b)}>
            {b.personalItem && <ShoppingBag className="h-3.5 w-3.5 text-radar" />}
            {b.carryOnKg ? <Briefcase className="h-3.5 w-3.5 text-radar" /> : null}
            {b.checkedBags > 0 ? <Luggage className="h-3.5 w-3.5 text-radar" /> : <Luggage className="h-3.5 w-3.5 text-ink-faint/50" />}
            <span>{baggageText(b)}</span>
          </span>
          {typeof offer.seatsRemaining === 'number' && offer.seatsRemaining <= 5 && (
            <span className="font-semibold text-instrument">Restam {offer.seatsRemaining} assento(s)</span>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="ml-auto flex items-center gap-1 font-semibold text-horizon hover:underline"
          >
            {open ? 'Ocultar detalhes' : 'Detalhes do voo'}
            <ChevronDown className={clsx('h-3.5 w-3.5 transition', open && 'rotate-180')} />
          </button>
        </div>

        {open && (
          <div className="mt-4 grid gap-5 rounded-xl border border-line bg-cockpit-900/50 p-3 sm:p-4 lg:grid-cols-2">
            {offer.slices.map((s, i) => (
              <SliceDetails key={i} slice={s} />
            ))}
          </div>
        )}
      </div>

      {/* Canhoto (preço) */}
      <div className="perforation relative hidden w-px shrink-0 sm:block">
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full border border-line bg-cockpit-900" />
        <span className="absolute -bottom-2.5 -left-2.5 h-5 w-5 rounded-full border border-line bg-cockpit-900" />
      </div>
      <div className="flex w-full shrink-0 flex-col justify-between gap-3 rounded-b-2xl border-t border-dashed border-line-strong bg-gradient-to-b from-panel-3/80 to-panel p-4 sm:w-56 sm:rounded-bl-none sm:rounded-r-2xl sm:border-t-0 sm:p-5">
        <div className="flex flex-wrap justify-end gap-1.5">
          {flags.cheapest && (
            <span className="chip border-instrument bg-instrument text-cockpit-900">
              <Coins className="h-3 w-3" /> Melhor preço
            </span>
          )}
          {flags.fastest && (
            <span className="chip border-horizon/60 bg-horizon/10 text-horizon">
              <Zap className="h-3 w-3" /> Mais rápido
            </span>
          )}
          {flags.promo && (
            <span className="chip border-radar/60 bg-radar/15 text-radar">
              <TrendingDown className="h-3 w-3" /> Tarifa promo
            </span>
          )}
        </div>

        {offer.isAward && offer.miles ? (
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{offer.miles.program}</div>
            <div className="mt-1 font-mono text-2xl font-extrabold leading-none text-instrument">
              {points(offer.miles.pointsTotal)}
            </div>
            <div className="font-mono text-[11px] text-ink-muted">milhas no total</div>
            <div className="mt-1.5 font-mono text-sm font-bold text-ink">
              + {money(offer.miles.taxesTotal, offer.miles.taxesCurrency)}
            </div>
            <div className="text-[11px] text-ink-muted">em taxas</div>
            <div className="mt-2 border-t border-line pt-2 font-mono text-[11px] text-ink-muted">
              {points(offer.miles.pointsPerPassenger)} mi + {money(offer.miles.taxesPerPassenger, offer.miles.taxesCurrency)} / pax
              <div className="text-ink-faint">≈ {money(offer.miles.equivalentBRL)} equivalente</div>
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Total · {pax} passageiro{pax > 1 ? 's' : ''}
            </div>
            <div className="mt-1 font-mono text-2xl font-extrabold leading-tight text-ink">{money(offer.totalPrice, offer.currency)}</div>
            <div className="mt-2 border-t border-line pt-2">
              <div className="font-mono text-base font-bold text-horizon">{money(offer.pricePerAdult, offer.currency)}</div>
              <div className="text-[11px] text-ink-muted">por adulto · taxas incluídas</div>
              {offer.pricePerChild !== undefined && passengers.children > 0 && (
                <div className="mt-1 font-mono text-[11px] text-ink-muted">
                  {money(offer.pricePerChild, offer.currency)} por criança
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-1 font-mono text-[10px] text-ink-faint">
          <Clock className="h-3 w-3" /> {duration(offer.totalDurationMin)} em voo/solo
        </div>
      </div>
    </article>
  );
}
