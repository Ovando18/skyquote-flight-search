'use client';

import clsx from 'clsx';
import {
  ArrowLeftRight,
  ArrowRight,
  Armchair,
  CalendarDays,
  ChevronDown,
  LoaderCircle,
  PlaneLanding,
  PlaneTakeoff,
  Repeat,
  Search,
} from 'lucide-react';
import AirportInput from './AirportInput';
import PassengerSelector from './PassengerSelector';
import SourceSelector from './SourceSelector';
import { CABIN_LABELS, type CabinClass, type SearchParams, type TripType } from '@/lib/types';
import { todayISO } from '@/lib/time';

interface Props {
  value: SearchParams;
  onChange: (p: SearchParams) => void;
  onSubmit: () => void;
  loading: boolean;
  error?: string | null;
}

const TRIP_TABS: { id: TripType; label: string; icon: React.ReactNode }[] = [
  { id: 'roundtrip', label: 'Ida e Volta', icon: <Repeat className="h-4 w-4" /> },
  { id: 'oneway', label: 'Somente Ida', icon: <ArrowRight className="h-4 w-4" /> },
];

export default function SearchPanel({ value: p, onChange, onSubmit, loading, error }: Props) {
  const set = (patch: Partial<SearchParams>) => onChange({ ...p, ...patch });
  const today = todayISO();
  const oneway = p.tripType === 'oneway';

  return (
    <form
      className="panel relative p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {/* Tipo de viagem */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Tipo de viagem" className="inline-flex rounded-xl border border-line bg-cockpit-800/80 p-1">
          {TRIP_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={p.tripType === t.id}
              onClick={() => set({ tripType: t.id })}
              className={clsx(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                p.tripType === t.id ? 'bg-horizon text-cockpit-900 shadow-glow' : 'text-ink-muted hover:text-ink',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint md:flex">
          <span className="h-1.5 w-1.5 animate-blip rounded-full bg-radar" /> Plano de voo
        </div>
      </div>

      {/* Linha principal */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="relative grid gap-4 sm:grid-cols-2 lg:col-span-5">
          <AirportInput
            label="Origem"
            icon={<PlaneTakeoff className="h-3.5 w-3.5" />}
            value={p.origin}
            exclude={p.destination}
            placeholder="De onde?"
            onChange={(origin) => set({ origin })}
          />
          <AirportInput
            label="Destino"
            icon={<PlaneLanding className="h-3.5 w-3.5" />}
            value={p.destination}
            exclude={p.origin}
            placeholder="Para onde?"
            onChange={(destination) => set({ destination })}
          />
          <button
            type="button"
            title="Inverter origem e destino"
            aria-label="Inverter origem e destino"
            onClick={() => set({ origin: p.destination, destination: p.origin })}
            className="absolute left-1/2 top-[30px] z-10 hidden h-9 w-9 -translate-x-1/2 place-items-center rounded-full border border-line-strong bg-panel-2 text-horizon shadow-card transition hover:rotate-180 hover:border-horizon sm:grid"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => set({ origin: p.destination, destination: p.origin })}
            className="btn-ghost -mt-2 py-1.5 text-xs sm:hidden"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> Inverter
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-3">
          <div>
            <label className="label" htmlFor="depart">
              <CalendarDays className="h-3.5 w-3.5" /> Data de ida
            </label>
            <input
              id="depart"
              type="date"
              className="field font-mono"
              min={today}
              value={p.departDate}
              required
              onChange={(e) => {
                const departDate = e.target.value;
                const patch: Partial<SearchParams> = { departDate };
                if (p.returnDate && departDate > p.returnDate) patch.returnDate = departDate;
                set(patch);
              }}
            />
          </div>
          <div className={clsx('transition', oneway && 'opacity-40')}>
            <label className="label" htmlFor="return">
              <CalendarDays className="h-3.5 w-3.5" /> Data de volta
            </label>
            <input
              id="return"
              type="date"
              className="field font-mono disabled:cursor-not-allowed"
              min={p.departDate || today}
              value={oneway ? '' : (p.returnDate ?? '')}
              disabled={oneway}
              required={!oneway}
              onChange={(e) => set({ returnDate: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-4">
          <PassengerSelector
            adults={p.adults}
            children={p.children}
            onChange={(adults, children) => set({ adults, children })}
          />
          <div>
            <label className="label" htmlFor="cabin">
              <Armchair className="h-3.5 w-3.5" /> Classe
            </label>
            <div className="relative">
              <select
                id="cabin"
                className="field appearance-none pr-9"
                value={p.cabin}
                onChange={(e) => set({ cabin: e.target.value as CabinClass })}
              >
                {(Object.keys(CABIN_LABELS) as CabinClass[]).map((c) => (
                  <option key={c} value={c} className="bg-panel-2">
                    {CABIN_LABELS[c]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            </div>
          </div>
        </div>
      </div>

      <div className="my-5 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />

      <SourceSelector seatsAero={p.includeSeatsAero} onSeatsAero={(includeSeatsAero) => set({ includeSeatsAero })} />

      <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={clsx('text-sm', error ? 'text-red-400' : 'text-ink-faint')} role={error ? 'alert' : undefined}>
          {error ?? `Todas as companhias${p.includeSeatsAero ? ' + disponibilidade em milhas (Seats.aero)' : ''}`}
        </p>
        <button type="submit" className="btn-primary px-8 py-3 text-base" disabled={loading}>
          {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          {loading ? 'Varrendo rotas...' : 'Buscar voos'}
        </button>
      </div>
    </form>
  );
}
