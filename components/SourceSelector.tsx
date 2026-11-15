'use client';

import clsx from 'clsx';
import { Check, Globe2, Radar, Sparkles } from 'lucide-react';
import { AIRLINES } from '@/lib/airlines';

interface Props {
  seatsAero: boolean;
  onSeatsAero: (v: boolean) => void;
}

/** Fontes da busca: todas as companhias aéreas (sempre) + Seats.aero (opcional) */
export default function SourceSelector({ seatsAero, onSeatsAero }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_minmax(0,360px)]">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-cockpit-800/60 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-horizon/40 bg-horizon/10 text-horizon">
          <Globe2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-ink">Todas as companhias aéreas</div>
          <p className="text-xs text-ink-muted">
            A busca retorna todos os voos possíveis para a rota, independente da companhia. Filtre por companhia nos resultados.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {AIRLINES.map((a) => (
              <span
                key={a.code}
                title={a.name}
                className="rounded px-1 font-mono text-[10px] font-bold text-white/90"
                style={{ background: `${a.color}CC` }}
              >
                {a.code}
              </span>
            ))}
          </div>
        </div>
      </div>

      <label
        className={clsx(
          'relative flex cursor-pointer select-none items-center gap-3 overflow-hidden rounded-2xl border p-4 transition',
          seatsAero
            ? 'border-instrument/70 bg-gradient-to-br from-instrument/15 to-transparent shadow-amber'
            : 'border-line bg-cockpit-800/60 hover:border-instrument/40',
        )}
      >
        <input type="checkbox" className="sr-only" checked={seatsAero} onChange={(e) => onSeatsAero(e.target.checked)} />
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-instrument/20">
          <div className="absolute inset-4 rounded-full border border-instrument/15" />
          {seatsAero && (
            <div
              className="absolute inset-0 animate-sweep rounded-full"
              style={{ background: 'conic-gradient(from 0deg, rgba(245,158,11,0.35), transparent 25%)' }}
            />
          )}
        </div>
        <span
          className={clsx(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl border',
            seatsAero ? 'border-instrument bg-instrument text-cockpit-900' : 'border-instrument/40 text-instrument',
          )}
        >
          <Radar className="h-5 w-5" />
        </span>
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
            Incluir Seats.aero <Sparkles className="h-3.5 w-3.5 text-instrument" />
          </div>
          <div className="text-xs text-ink-muted">Disponibilidade Award / Milhas (Smiles, Azul, Flying Blue, AAdvantage…)</div>
        </div>
        <span
          className={clsx(
            'relative grid h-5 w-5 shrink-0 place-items-center rounded-md border',
            seatsAero ? 'border-instrument bg-instrument text-cockpit-900' : 'border-line-strong bg-cockpit-900',
          )}
        >
          {seatsAero && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </label>
    </div>
  );
}
