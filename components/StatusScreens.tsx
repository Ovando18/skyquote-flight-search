import { Plane, PlaneTakeoff, Radar, SearchX } from 'lucide-react';

export function RadarLoader({ route }: { route: string }) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="relative h-44 w-44 rounded-full border border-radar/30 bg-radar/[0.03]">
        <div className="absolute inset-6 rounded-full border border-radar/20" />
        <div className="absolute inset-12 rounded-full border border-radar/15" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-radar/15" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-radar/15" />
        <div
          className="absolute inset-0 animate-sweep rounded-full"
          style={{ background: 'conic-gradient(from 0deg, rgba(16,185,129,0.45), transparent 22%)' }}
        />
        {[
          [28, 34, '0s'],
          [64, 22, '0.6s'],
          [72, 66, '1.1s'],
          [36, 70, '0.3s'],
        ].map(([l, t, d], i) => (
          <span
            key={i}
            className="absolute h-2 w-2 animate-blip rounded-full bg-radar shadow-[0_0_10px_2px_rgba(16,185,129,0.6)]"
            style={{ left: `${l}%`, top: `${t}%`, animationDelay: d as string }}
          />
        ))}
        <Plane className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-radar" />
      </div>
      <div>
        <div className="font-mono text-sm font-bold uppercase tracking-[0.25em] text-radar">Varredura em andamento</div>
        <p className="mt-2 text-sm text-ink-muted">
          Consultando companhias e disponibilidade para <span className="font-mono font-bold text-ink">{route}</span>…
        </p>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="panel relative overflow-hidden px-6 py-14 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px route-dash opacity-40" />
      <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-horizon/40 bg-cockpit-900 text-horizon shadow-glow">
        <PlaneTakeoff className="h-7 w-7" />
      </div>
      <h2 className="relative mt-5 text-xl font-bold text-ink">Pronto para decolagem</h2>
      <p className="relative mx-auto mt-2 max-w-lg text-sm text-ink-muted">
        Defina o plano de voo acima e clique em <b className="text-ink">Buscar voos</b>. Os resultados são listados do menor para o
        maior valor — marque as opções desejadas para gerar uma cotação profissional em PDF.
      </p>
      <div className="relative mt-6 flex flex-wrap justify-center gap-2 font-mono text-[11px] text-ink-faint">
        {['CGR → MAD', 'GRU → LIS', 'GIG → MIA', 'BSB → EZE', 'CGH → SDU'].map((r) => (
          <span key={r} className="rounded-md border border-line bg-cockpit-800 px-2 py-1">
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NoResults({ notes }: { notes: string[] }) {
  return (
    <div className="panel px-6 py-12 text-center">
      <SearchX className="mx-auto h-10 w-10 text-ink-faint" />
      <h3 className="mt-4 text-lg font-bold text-ink">Nenhum voo encontrado</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
        Tente outras datas, inclua mais companhias (ex.: estrangeiras) ou ative o <span className="text-instrument">Seats.aero</span>.
      </p>
      {notes.length > 0 && (
        <ul className="mx-auto mt-4 max-w-lg space-y-1 text-left text-xs text-ink-faint">
          {notes.map((n) => (
            <li key={n} className="flex gap-2">
              <Radar className="mt-0.5 h-3 w-3 shrink-0" /> {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
