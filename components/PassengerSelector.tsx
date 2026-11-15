'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus, Users } from 'lucide-react';
import { passengersLabel } from '@/lib/format';

interface Props {
  adults: number;
  children: number;
  onChange: (adults: number, children: number) => void;
}

const MAX = 9;

function Counter({
  label,
  hint,
  value,
  min,
  canInc,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  canInc: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="text-[11px] text-ink-muted">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Remover ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-cockpit-800 text-ink transition hover:border-horizon hover:text-horizon disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center font-mono text-base font-bold">{value}</span>
        <button
          type="button"
          aria-label={`Adicionar ${label}`}
          disabled={!canInc}
          onClick={() => onChange(value + 1)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-cockpit-800 text-ink transition hover:border-horizon hover:text-horizon disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function PassengerSelector({ adults, children, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = adults + children;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <span className="label">
        <Users className="h-3.5 w-3.5" /> Passageiros
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="field flex items-center justify-between text-left"
      >
        <span className="truncate">{passengersLabel(adults, children)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-72 rounded-xl border border-line bg-panel-2 p-3 shadow-card">
          <div className="divide-y divide-line">
            <Counter
              label="Adultos"
              hint="12 anos ou mais"
              value={adults}
              min={1}
              canInc={total < MAX}
              onChange={(v) => onChange(v, children)}
            />
            <Counter
              label="Crianças"
              hint="2 a 11 anos"
              value={children}
              min={0}
              canInc={total < MAX}
              onChange={(v) => onChange(adults, v)}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-ink-faint">Máximo de {MAX} passageiros por cotação</span>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-horizon hover:underline">
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
