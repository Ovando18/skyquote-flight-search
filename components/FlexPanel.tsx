'use client';

import clsx from 'clsx';
import {
  ArrowLeftRight,
  ArrowRight,
  Armchair,
  CalendarRange,
  ChevronDown,
  LoaderCircle,
  PlaneLanding,
  PlaneTakeoff,
  Repeat,
  Sparkles,
} from 'lucide-react';
import AirportInput from './AirportInput';
import PassengerSelector from './PassengerSelector';
import SourceSelector from './SourceSelector';
import { CABIN_LABELS, type CabinClass, type FlexParams, type TripType } from '@/lib/types';
import { dayDiff, todayISO } from '@/lib/time';

interface Props {
  value: FlexParams;
  onChange: (p: FlexParams) => void;
  onSubmit: () => void;
  loading: boolean;
  error?: string | null;
  maxDays: number;
}

function RangeField({
  label,
  icon,
  start,
  end,
  min,
  disabled,
  maxDays,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  start: string;
  end: string;
  min: string;
  disabled?: boolean;
  maxDays: number;
  onChange: (start: string, end: string) => void;
}) {
  const days = start && end ? dayDiff(start, end) + 1 : 0;
  return (
    <div className={clsx('transition', disabled && 'pointer-events-none opacity-40')}>
      <span className="label">
        {icon} {label}
        {days > 0 && !disabled && (
          <span className={clsx('ml-auto font-mono normal-case tracking-normal', days > maxDays ? 'text-instrument' : 'text-ink-faint')}>
            {days} dia{days > 1 ? 's' : ''}
            {days > maxDays ? ` (máx. ${maxDays})` : ''}
          </span>
        )}
      </span>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          aria-label={`${label} - de`}
          className="field font-mono"
          min={min}
          value={disabled ? '' : start}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value, end && end < e.target.value ? e.target.value : end)}
        />
        <input
          type="date"
          aria-label={`${label} - até`}
          className="field font-mono"
          min={start || min}
          value={disabled ? '' : end}
          disabled={disabled}
          onChange={(e) => onChange(start, e.target.value)}
        />
      </div>
    </div>
  );
}

const TRIP_TABS: { id: TripType; label: string; icon: React.ReactNode }[] = [
  { id: 'roundtrip', label: 'Ida e Volta', icon: <Repeat className="h-4 w-4" /> },
  { id: 'oneway', label: 'Somente Ida', icon: <ArrowRight className="h-4 w-4" /> },
];

export default function FlexPanel({ value: p, onChange, onSubmit, loading, error, maxDays }: Props) {
  const set = (patch: Partial<FlexParams>) => onChange({ ...p, ...patch });
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
        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Sparkles className="h-3.5 w-3.5 text-instrument" />
          Melhores valores por data e companhia — ida e volta avaliadas separadamente
        </p>
      </div>

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
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-7">
          <PassengerSelector adults={p.adults} children={p.children} onChange={(adults, children) => set({ adults, children })} />
          <div>
            <label className="label" htmlFor="flex-cabin">
              <Armchair className="h-3.5 w-3.5" /> Classe
            </label>
            <div className="relative">
              <select
                id="flex-cabin"
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

        <div className="lg:col-span-6">
          <RangeField
            label="Período da ida"
            icon={<CalendarRange className="h-3.5 w-3.5" />}
            start={p.outStart}
            end={p.outEnd}
            min={today}
            maxDays={maxDays}
            onChange={(outStart, outEnd) => set({ outStart, outEnd })}
          />
        </div>
        <div className="lg:col-span-6">
          <RangeField
            label="Período da volta"
            icon={<CalendarRange className="h-3.5 w-3.5" />}
            start={p.retStart ?? ''}
            end={p.retEnd ?? ''}
            min={p.outStart || today}
            disabled={oneway}
            maxDays={maxDays}
            onChange={(retStart, retEnd) => set({ retStart, retEnd })}
          />
        </div>
      </div>

      <div className="my-5 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
      <SourceSelector seatsAero={p.includeSeatsAero} onSeatsAero={(includeSeatsAero) => set({ includeSeatsAero })} />

      <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={clsx('text-sm', error ? 'text-red-400' : 'text-ink-faint')} role={error ? 'alert' : undefined}>
          {error ?? `Até ${maxDays} dias por período${maxDays < 31 ? ' no modo ao vivo (economia de créditos)' : ''}`}
        </p>
        <button type="submit" className="btn-primary px-8 py-3 text-base" disabled={loading}>
          {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <CalendarRange className="h-5 w-5" />}
          {loading ? 'Varrendo datas...' : 'Buscar melhores datas'}
        </button>
      </div>
    </form>
  );
}
