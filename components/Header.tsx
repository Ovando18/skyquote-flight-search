'use client';

import { LogOut, Plane, Settings } from 'lucide-react';
import clsx from 'clsx';
import type { SearchMode } from '@/lib/types';

export default function Header({ mode, onOpenSettings }: { mode: SearchMode; onOpenSettings: () => void }) {
  const live = mode === 'live';
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cockpit-900/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-horizon/40 bg-horizon/10">
            <Plane className="h-5 w-5 -rotate-45 text-horizon" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-blip rounded-full bg-radar" />
          </span>
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-tight text-ink">
              Sky<span className="text-horizon">Quote</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">Flight Search &amp; Quotation</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span
            className={clsx(
              'chip hidden py-1 sm:inline-flex',
              live ? 'border-radar/50 bg-radar/10 text-radar' : 'border-instrument/50 bg-instrument/10 text-instrument',
            )}
            title={live ? 'Consultando APIs configuradas' : 'Usando o motor de simulação'}
          >
            <span className={clsx('h-1.5 w-1.5 animate-blip rounded-full', live ? 'bg-radar' : 'bg-instrument')} />
            {live ? 'Ao vivo' : 'Simulação'}
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink-muted transition hover:border-horizon/60 hover:text-ink"
            title="Configurar APIs"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurar APIs</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/logout', { method: 'POST' }).catch(() => null);
              window.location.href = '/login';
            }}
            className="rounded-xl border border-line p-2 text-ink-muted transition hover:border-red-400/50 hover:text-red-300"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
