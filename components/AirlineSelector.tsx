'use client';

import clsx from 'clsx';
import { Check, Globe2, Radar, Sparkles } from 'lucide-react';
import { FOREIGN_AIRLINES, NATIONAL_AIRLINES, type Airline } from '@/lib/airlines';

interface Props {
  selected: string[];
  onChange: (codes: string[]) => void;
  seatsAero: boolean;
  onSeatsAero: (v: boolean) => void;
}

function Pill({ al, checked, onToggle }: { al: Airline; checked: boolean; onToggle: () => void }) {
  return (
    <label
      className={clsx(
        'group flex cursor-pointer select-none items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-3 text-sm transition',
        checked
          ? 'border-horizon/60 bg-horizon/10 text-ink shadow-[0_0_0_1px_rgba(56,189,248,0.15)]'
          : 'border-line bg-cockpit-800/60 text-ink-muted hover:border-line-strong hover:text-ink',
      )}
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
      <span
        className={clsx(
          'grid h-5 w-5 place-items-center rounded-md border transition',
          checked ? 'border-horizon bg-horizon text-cockpit-900' : 'border-line-strong bg-cockpit-900',
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="h-2 w-2 rounded-full" style={{ background: al.color }} aria-hidden />
      <span className="font-medium">{al.name}</span>
      <span className="font-mono text-[11px] font-bold text-ink-faint group-hover:text-ink-muted">({al.code})</span>
    </label>
  );
}

export default function AirlineSelector({ selected, onChange, seatsAero, onSeatsAero }: Props) {
  const set = new Set(selected);
  const toggle = (code: string) => {
    const next = new Set(set);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(Array.from(next));
  };
  const foreignCodes = FOREIGN_AIRLINES.map((a) => a.code);
  const allForeign = foreignCodes.every((c) => set.has(c));
  const toggleAllForeign = () => {
    const next = new Set(set);
    foreignCodes.forEach((c) => (allForeign ? next.delete(c) : next.add(c)));
    onChange(Array.from(next));
  };
  const nationalCodes = NATIONAL_AIRLINES.map((a) => a.code);
  const allNational = nationalCodes.every((c) => set.has(c));
  const toggleAllNational = () => {
    const next = new Set(set);
    nationalCodes.forEach((c) => (allNational ? next.delete(c) : next.add(c)));
    onChange(Array.from(next));
  };
  const foreignCount = foreignCodes.filter((c) => set.has(c)).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0">🇧🇷 Companhias nacionais</span>
            <button type="button" onClick={toggleAllNational} className="text-[11px] font-semibold text-horizon hover:underline">
              {allNational ? 'Desmarcar todas' : 'Selecionar todas'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {NATIONAL_AIRLINES.map((al) => (
              <Pill key={al.code} al={al} checked={set.has(al.code)} onToggle={() => toggle(al.code)} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0">
              <Globe2 className="h-3.5 w-3.5" /> Companhias estrangeiras
              <span className="ml-1 rounded bg-panel-2 px-1.5 font-mono text-[10px] text-ink-muted">
                {foreignCount}/{foreignCodes.length}
              </span>
            </span>
            <button type="button" onClick={toggleAllForeign} className="text-[11px] font-semibold text-horizon hover:underline">
              {allForeign ? 'Desmarcar todas' : 'Selecionar todas'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {FOREIGN_AIRLINES.map((al) => (
              <Pill key={al.code} al={al} checked={set.has(al.code)} onToggle={() => toggle(al.code)} />
            ))}
          </div>
        </div>
      </div>

      <label
        className={clsx(
          'relative flex cursor-pointer select-none flex-col justify-between overflow-hidden rounded-2xl border p-4 transition',
          seatsAero
            ? 'border-instrument/70 bg-gradient-to-br from-instrument/15 to-transparent shadow-amber'
            : 'border-line bg-cockpit-800/60 hover:border-instrument/40',
        )}
      >
        <input type="checkbox" className="sr-only" checked={seatsAero} onChange={(e) => onSeatsAero(e.target.checked)} />
        {/* mini radar decorativo */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full border border-instrument/20">
          <div className="absolute inset-4 rounded-full border border-instrument/15" />
          <div className="absolute inset-9 rounded-full border border-instrument/10" />
          {seatsAero && (
            <div
              className="absolute inset-0 animate-sweep rounded-full"
              style={{ background: 'conic-gradient(from 0deg, rgba(245,158,11,0.35), transparent 25%)' }}
            />
          )}
        </div>
        <div className="relative flex items-start gap-3">
          <span
            className={clsx(
              'grid h-10 w-10 shrink-0 place-items-center rounded-xl border',
              seatsAero ? 'border-instrument bg-instrument text-cockpit-900' : 'border-instrument/40 text-instrument',
            )}
          >
            <Radar className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
              Seats.aero
              <Sparkles className="h-3.5 w-3.5 text-instrument" />
            </div>
            <div className="text-xs text-ink-muted">Disponibilidade Award / Milhas</div>
          </div>
        </div>
        <p className="relative mt-3 text-[11px] leading-relaxed text-ink-muted">
          Varre assentos de resgate em programas como Smiles, Azul Fidelidade, Flying Blue, AAdvantage, Aeroplan e outros.
        </p>
        <div className="relative mt-3 flex items-center gap-2">
          <span
            className={clsx(
              'grid h-5 w-5 place-items-center rounded-md border',
              seatsAero ? 'border-instrument bg-instrument text-cockpit-900' : 'border-line-strong bg-cockpit-900',
            )}
          >
            {seatsAero && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
          <span className="text-xs font-semibold text-ink">{seatsAero ? 'Incluído na busca' : 'Incluir na busca'}</span>
        </div>
      </label>
    </div>
  );
}
