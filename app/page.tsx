'use client';

import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, ArrowDownWideNarrow, Clock, Coins, Filter, Info, Radar } from 'lucide-react';
import Header from '@/components/Header';
import SearchPanel from '@/components/SearchPanel';
import FlightCard, { type CardFlags } from '@/components/FlightCard';
import SelectionBar from '@/components/SelectionBar';
import SettingsModal from '@/components/SettingsModal';
import { EmptyState, NoResults, RadarLoader } from '@/components/StatusScreens';
import { useApiConfig } from '@/lib/settings';
import { DEFAULT_AIRLINES } from '@/lib/airlines';
import { addDays, todayISO } from '@/lib/time';
import { duration, money } from '@/lib/format';
import { PROVIDER_LABELS, type FlightOffer, type SearchParams, type SearchResponse } from '@/lib/types';
import { runSearch } from '@/services/searchClient';

type SortKey = 'price' | 'duration';
type StopsFilter = 'all' | 'direct' | 'max1';
type KindFilter = 'all' | 'cash' | 'award';

function initialParams(): SearchParams {
  const t = todayISO();
  return {
    tripType: 'roundtrip',
    origin: 'CGR',
    destination: 'MAD',
    departDate: addDays(t, 30),
    returnDate: addDays(t, 45),
    adults: 1,
    children: 0,
    cabin: 'economy',
    airlines: [...DEFAULT_AIRLINES],
    includeSeatsAero: false,
  };
}

function maxStops(o: FlightOffer) {
  return Math.max(...o.slices.map((s) => s.segments.length - 1));
}

export default function Home() {
  const { config, save, reset } = useApiConfig();
  const [params, setParams] = useState<SearchParams>(initialParams);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>('price');
  const [stops, setStops] = useState<StopsFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const search = useCallback(async () => {
    setError(null);
    if (!params.origin || !params.destination) return setError('Informe origem e destino.');
    if (params.origin === params.destination) return setError('Origem e destino devem ser diferentes.');
    if (!params.airlines.length && !params.includeSeatsAero)
      return setError('Selecione ao menos uma companhia aérea ou o Seats.aero.');
    if (params.tripType === 'roundtrip' && !params.returnDate) return setError('Informe a data de volta.');
    setLoading(true);
    setSelected(new Set());
    try {
      const p: SearchParams = params.tripType === 'oneway' ? { ...params, returnDate: undefined } : params;
      const r = await runSearch(p, config);
      setResult(r);
      setStops('all');
      setKind('all');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params, config]);

  const offers = result?.offers ?? [];
  const hasAwards = offers.some((o) => o.isAward);
  const hasCash = offers.some((o) => !o.isAward);

  const visible = useMemo(() => {
    let list = offers.filter((o) => {
      if (stops === 'direct' && maxStops(o) > 0) return false;
      if (stops === 'max1' && maxStops(o) > 1) return false;
      if (kind === 'cash' && o.isAward) return false;
      if (kind === 'award' && !o.isAward) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      sort === 'price'
        ? a.sortPrice - b.sortPrice || a.totalDurationMin - b.totalDurationMin
        : a.totalDurationMin - b.totalDurationMin || a.sortPrice - b.sortPrice,
    );
    return list;
  }, [offers, stops, kind, sort]);

  const flags = useMemo(() => {
    const map = new Map<string, CardFlags>();
    if (!offers.length) return map;
    const cheapest = [...offers].sort((a, b) => a.sortPrice - b.sortPrice)[0];
    const fastest = [...offers].sort((a, b) => a.totalDurationMin - b.totalDurationMin || a.sortPrice - b.sortPrice)[0];
    const cash = offers.filter((o) => !o.isAward).map((o) => o.sortPrice).sort((a, b) => a - b);
    const median = cash.length ? cash[Math.floor(cash.length / 2)] : 0;
    for (const o of offers) {
      map.set(o.id, {
        cheapest: o.id === cheapest.id,
        fastest: o.id === fastest.id,
        promo: !o.isAward && cash.length >= 4 && o.sortPrice <= median * 0.82,
      });
    }
    return map;
  }, [offers]);

  const stats = useMemo(() => {
    if (!offers.length) return null;
    const cash = offers.filter((o) => !o.isAward);
    return {
      minCash: cash.length ? Math.min(...cash.map((o) => o.totalPrice)) : undefined,
      minDur: Math.min(...offers.map((o) => o.totalDurationMin)),
      direct: offers.filter((o) => maxStops(o) === 0).length,
      airlines: new Set(offers.map((o) => o.airline)).size,
    };
  }, [offers]);

  const selectedOffers = offers.filter((o) => selected.has(o.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const generate = async () => {
    if (!result || !selectedOffers.length) return;
    setGenerating(true);
    try {
      const { generateQuotePdf } = await import('@/lib/pdf');
      await generateQuotePdf(selectedOffers, result.params);
    } catch (e) {
      setError(`Falha ao gerar PDF: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const route = `${params.origin} → ${params.destination}`;
  const searchedRoute = result ? `${result.params.origin} → ${result.params.destination}` : route;

  return (
    <>
      <Header mode={config.mode} onOpenSettings={() => setSettingsOpen(true)} />

      <main className={clsx('mx-auto max-w-7xl px-4 pt-6 sm:px-6', selected.size ? 'pb-36' : 'pb-16')}>
        <section className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Pesquisa e comparação de <span className="text-horizon">passagens aéreas</span>
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Tarifas em dinheiro e disponibilidade em milhas, lado a lado — com cotação em PDF pronta para enviar.
          </p>
        </section>

        <SearchPanel value={params} onChange={setParams} onSubmit={search} loading={loading} error={error} />

        <section className="mt-8" aria-live="polite">
          {loading ? (
            <RadarLoader route={route} />
          ) : !result ? (
            <EmptyState />
          ) : (
            <>
              {/* Painel de status */}
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { k: 'Resultados', v: String(offers.length), sub: searchedRoute, icon: Radar, c: 'text-horizon' },
                  { k: 'Menor tarifa', v: stats?.minCash !== undefined ? money(stats.minCash) : '—', sub: 'total em dinheiro', icon: Coins, c: 'text-instrument' },
                  { k: 'Menor duração', v: stats ? duration(stats.minDur) : '—', sub: 'soma dos trechos', icon: Clock, c: 'text-horizon' },
                  { k: 'Voos diretos', v: String(stats?.direct ?? 0), sub: `${stats?.airlines ?? 0} companhia(s)`, icon: ArrowDownWideNarrow, c: 'text-radar' },
                ].map((s) => (
                  <div key={s.k} className="panel flex items-center gap-3 px-4 py-3">
                    <s.icon className={clsx('h-5 w-5 shrink-0', s.c)} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{s.k}</div>
                      <div className="font-mono text-lg font-bold text-ink">{s.v}</div>
                      <div className="truncate font-mono text-[11px] text-ink-muted">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Avisos */}
              {result.warnings.length > 0 && (
                <details className="mb-4 rounded-xl border border-instrument/30 bg-instrument/5 px-4 py-2.5 text-sm text-instrument">
                  <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" /> {result.warnings.length} aviso(s) da busca
                    <span className="ml-auto text-[11px] font-normal text-ink-muted">clique para ver</span>
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                    {result.warnings.map((w) => (
                      <li key={w} className="flex gap-2">
                        <Info className="mt-0.5 h-3 w-3 shrink-0 text-instrument" /> {w}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Toolbar */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-xl border border-line bg-panel p-1" role="tablist" aria-label="Ordenação">
                  {(
                    [
                      ['price', 'Menor preço', Coins],
                      ['duration', 'Menor duração', Clock],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={sort === id}
                      onClick={() => setSort(id)}
                      className={clsx(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                        sort === id ? 'bg-horizon text-cockpit-900' : 'text-ink-muted hover:text-ink',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-ink-faint" />
                  {(
                    [
                      ['all', 'Todas paradas'],
                      ['direct', 'Somente diretos'],
                      ['max1', 'Até 1 conexão'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setStops(id)}
                      className={clsx(
                        'rounded-lg border px-2.5 py-1 text-xs transition',
                        stops === id ? 'border-horizon/60 bg-horizon/10 text-horizon' : 'border-line text-ink-muted hover:text-ink',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {hasAwards && hasCash && (
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        ['all', 'Dinheiro + Milhas'],
                        ['cash', 'Dinheiro'],
                        ['award', 'Milhas'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setKind(id)}
                        className={clsx(
                          'rounded-lg border px-2.5 py-1 text-xs transition',
                          kind === id ? 'border-instrument/60 bg-instrument/10 text-instrument' : 'border-line text-ink-muted hover:text-ink',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="ml-auto flex flex-wrap items-center gap-1.5 text-[11px] text-ink-faint">
                  {result.providers.map((p, i) => (
                    <span
                      key={i}
                      className={clsx('chip', p.error ? 'border-red-400/40 text-red-300' : p.simulated ? 'border-line text-ink-muted' : 'border-radar/40 text-radar')}
                      title={p.error ?? `${p.count} resultado(s)`}
                    >
                      {PROVIDER_LABELS[p.provider]}
                      {p.provider === 'seats.aero' && p.simulated ? ' (sim.)' : ''} · {p.count}
                    </span>
                  ))}
                </div>
              </div>

              {visible.length === 0 ? (
                <NoResults notes={result.warnings} />
              ) : (
                <div className="space-y-4">
                  {visible.map((o, i) => (
                    <FlightCard
                      key={o.id}
                      index={i}
                      offer={o}
                      selected={selected.has(o.id)}
                      onToggle={() => toggle(o.id)}
                      flags={flags.get(o.id) ?? {}}
                      passengers={{ adults: result.params.adults, children: result.params.children }}
                    />
                  ))}
                  {config.milheiroValue && hasAwards && (
                    <p className="pt-2 text-center text-[11px] text-ink-faint">
                      Resgates em milhas são ordenados pelo valor equivalente (milheiro a {money(config.milheiroValue)} + taxas). Ajuste em
                      “Configurar APIs”.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <SelectionBar
        count={selectedOffers.length}
        minPrice={selectedOffers.length ? Math.min(...selectedOffers.map((o) => o.sortPrice)) : undefined}
        onClear={() => setSelected(new Set())}
        onGenerate={generate}
        generating={generating}
      />

      <SettingsModal open={settingsOpen} config={config} onClose={() => setSettingsOpen(false)} onSave={save} onReset={reset} />
    </>
  );
}
