import clsx from 'clsx';
import { Radar } from 'lucide-react';
import { airlineColor } from '@/lib/airlines';

export function AirlineBadge({ code, size = 'md' }: { code: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = airlineColor(code);
  return (
    <span
      className={clsx(
        'grid shrink-0 place-items-center rounded-lg font-mono font-extrabold tracking-wide text-white ring-1 ring-white/10',
        size === 'sm' && 'h-6 w-6 text-[10px]',
        size === 'md' && 'h-9 w-9 text-xs',
        size === 'lg' && 'h-11 w-11 text-sm',
      )}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}B3)` }}
      aria-hidden
    >
      {code}
    </span>
  );
}

export function SeatsAeroSeal({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-instrument/40 bg-instrument/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-instrument">
      <Radar className="h-3 w-3" />
      {compact ? 'Seats' : 'Seats.aero'}
    </span>
  );
}
