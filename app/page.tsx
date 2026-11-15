'use client';

import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Clock,
  Coins,
  Filter,
  Info,
  Radar,
} from 'lucide-react';
import Header from '@/components/Header';
import SearchPanel from '@/components/SearchPanel';
import FlexPanel from '@/components/FlexPanel';
import FlexResults from '@/components/FlexResults';
import FlightCard, { type CardFlags } from '@/components/FlightCard';
import SelectionBar from '@/components/SelectionBar';
import SettingsModal from '@/components/SettingsModal';
import BudgetModal from '@/components/BudgetModal';
import { AirlineBadge } from '@/components/AirlineBadge';
import { EmptyState, NoResults, RadarLoader } from '@/components/StatusScreens';
import { useApiConfig } from '@/lib/settings';
import { getAirline } from '@/lib/airlines';
import { addDays, todayISO } from '@/lib/time';
import { duration, money } from '@/lib/format';
import { deriveTrip } from '@/lib/trip';
import {
  PROVIDER_LABELS,
  type FlexParams,
  type FlexResponse,
  type FlightOffer,
  type SearchParams,
  type SearchResponse,
} from '@/lib/types';
import { runFlexSearch, runSearch } from '@/services/searchClient';

type Tab = 'dates' | 'flex';
type SortKey = 'price' | 'duration';
type StopsFilter = 'all' | 'direct' | 'max1';
type KindFilter = 'all' | 'cash' | 'award';

const PAGE = 25;

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
    airlines: [],
    includeSeatsAero: false,
  };
}

function initialFlex(): FlexParams {
  const t = todayISO();
  return {
    tripType: 'roundtrip',
    origin: 'CGR',
    destination: 'MAD',
    outStart: addDays(t, 15),
    outEnd: addDays(t, 44),
    retStart: addDays(t, 30),
    retEnd: addDays(t, 59),
    adults: 1,
    children: 0,
    cabin: 'economy',
    includeSeatsAero: false,
  };
}

function maxStops(o: FlightOffer) {
  return Math.max(...o.slices.map((s) => s.segments.length - 1));
}

export default function Home() {
  const { config, save, reset } = useApiConfig();
  const [tab, setTab] = useState<Tab>('dates');

  // Busca por datas
  const [params, setParams] = useState<SearchParams>(initialParams);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('price');
  const [stops, setStops] = useState<StopsFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');
  const [airlineFilter, setAirlineFilter] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE);

  // Datas flexíveis
  const [flexParams, setFlexParams] = useState<FlexParams>(initialFlex);
  const [flex, setFlex] = useState<FlexResponse | null>(null);
  const [flexLoading, setFlexLoading] = useState(false);
  const [flexError, setFlexError] = useState<string | null>(null);

  // Seleção (compartilhada entre as abas)
  const [selected, setSelected] = useState<Map<string, FlightOffer>>(new Map());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const search = useCallback(async () => {
    setError(null);
    if (!params.origin || !params.destination) return setError('Informe origem e destino.');
    if (params.origin === params.destination) return setError('Origem e destino devem ser diferentes.');
    if (params.tripType === 'roundtrip' && !params.returnDate) return setError('Informe a data de volta.');
    setLoading(true);
    try {
      const p: SearchParams = params.tripType === 'oneway' ? { ...params, returnDate: undefined } : params;
      const r = await runSearch({ ...p, airlines: [] }, config);
      setResult(r);
      setStops('all');
      setKind('all');
      setAirlineFilter([]);
      setLimit(PAGE);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params, config]);

  const searchFlex = useCallback(async () => {
    setFlexError(null);
    if (!flexParams.origin || !flexParams.destination) return setFlexError('Informe origem e destino.');
    if (flexParams.origin === flexParams.destination) return setFlexError('Origem e destino devem ser diferentes.');
    setFlexLoading(true);
    try {
      const p: FlexParams =
        flexParams.tripType === 'oneway' ? { ...flexParams, retStart: undefined, retEnd: undefined } : flexParams;
      setFlex(await runFlexSearch(p, config));
    } catch (e) {
      setFlexError((e as Error).message);
    } finally {
      setFlexLoading(false);
    }
  }, [flexParams, config]);

  const offers = useMemo(() => result?.offers ?? [], [result]);
  const hasAwards = offers.some((o) => o.isAward);
  const hasCash = offers.some((o) => !o.isAward);

  const airlineCounts = useMemo(() => {
    const m = new Map<string, { count: number; min: number }>();
    for (const o of offers) {
      if (o.isAward) continue;
      const c = m.get(o.airline) ?? { count: 0, min: Infinity };
      m.set(o.airline, { count: c.count + 1, min: Math.min(c.min, o.sortPrice) });
    }
    return Array.from(m.entries()).sort((a, b) => a[1].min - b[1].min);
  }, [offers]);

  const visible = useMemo(() => {
    const list = offers.filter((o) => {
      if (stops === 'direct' && maxStops(o) > 0) return false;
      if (stops === 'max1' && maxStops(o) > 1) return false;
      if (kind === 'cash' && o.isAward) return false;
      if (kind === 'award' && !o.isAward) return false;
      if (airlineFilter.length && !o.isAward && !airlineFilter.includes(o.airline)) return false;
      return true;
    });
    return [...list].sort((a, b) =>
      sort === 'price'
        ? a.sortPrice - b.sortPrice || a.totalDurationMin - b.totalDurationMin
        : a.totalDurationMin - b.totalDurationMin || a.sortPrice - b.sortPrice,
    );
  }, [offers, stops, kind, sort, airlineFilter]);

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
      airlines: new Set(cash.map((o) => o.airline)).size,
    };
  }, [offers]);

  const selectedOffers = useMemo(() => Array.from(selected.values()), [selected]);
  const selectedIds = useMemo(() => new Set(selected.keys()), [selected]);

  const toggle = useCallback(
    (o: FlightOffer) =>
      setSelected((s) => {
        const n = new Map(s);
        if (n.has(o.id)) n.delete(o.id);
        else n.set(o.id, o);
        return n;
      }),
    [],
  );

  const generateQuote = async () => {
    if (!selectedOffers.length) return;
    setGenerating(true);
    try {
      const { generateQuotePdf } = await import('@/lib/pdf');
      await generateQuotePdf(selectedOffers, deriveTrip(selectedOffers));
    } catch (e) {
      const msg = `Falha ao gerar PDF: ${(e as Error).message}`;
      if (tab === 'dates') setError(msg);
      else setFlexError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const searchedRoute = result ? `${result.params.origin} → ${result.params.destination}` : '';

  return (
    <>
      <Header mode={config.mode} onOpenSettings={() => setSettingsOpen(true)} />

      <main className={clsx('mx-auto max-w-7xl px-4 pt-6 sm:px-6', selected.size ? 'pb-40' : 'pb-16')}>
        <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Pesquisa e comparação de <span className="text-horizon">passagens aéreas</span>
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Todas as companhias, tarifas em dinheiro e milhas lado a lado — com cotação e orçamento em PDF.
            </p>
          </div>
          <div role="tablist" aria-label="Modo de busca" className="inline-flex rounded-2xl border border-line bg-panel p-1">
            {(
              [
                ['dates', 'Busca por data', CalendarDays],
                ['flex', 'Datas flexíveis', CalendarRange],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={clsx(
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                  tab === id ? 'bg-instrument text-cockpit-900 shadow-amber' : 'text-ink-muted hover:text-ink',
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </section>

        {/* ============================== BUSCA POR DATA */}
        <div hidden={tab !== 'dates'}>
          <SearchPanel value={params} onChange={setParams} onSubmit={search} loading={loading} error={error} />

          <section className="mt-8" aria-live="polite">
            {loading ? (
              <RadarLoader route={`${params.origin} → ${params.destination}`} />
            ) : !result ? (
              <EmptyState />
            ) : (
              <>
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

                {/* Filtro por companhia (pós-busca) */}
                {airlineCounts.length > 1 && (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Companhias</span>
                    <button
                      onClick={() => setAirlineFilter([])}
                      className={clsx(
                        'rounded-lg border px-2.5 py-1 text-xs transition',
                        !airlineFilter.length ? 'border-horizon/60 bg-horizon/10 text-horizon' : 'border-line text-ink-muted hover:text-ink',
                      )}
                    >
                      Todas
                    </button>
                    {airlineCounts.map(([code, info]) => {
                      const on = airlineFilter.includes(code);
                      return (
                        <button
                          key={code}
                          onClick={() => {
                            setLimit(PAGE);
                            setAirlineFilter((f) => (on ? f.filter((c) => c !== code) : [...f, code]));
                          }}
                          title={`A partir de ${money(info.min)}`}
                          className={clsx(
                            'flex items-center gap-1.5 rounded-lg border py-1 pl-1 pr-2.5 text-xs transition',
                            on ? 'border-horizon/60 bg-horizon/10 text-ink' : 'border-line text-ink-muted hover:text-ink',
                          )}
                        >
                          <AirlineBadge code={code} size="sm" />
                          {getAirline(code)?.shortName ?? code}
                          <span className="font-mono text-[10px] text-ink-faint">{info.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

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
                  <div className="flex flex-wrap items-center gap-1.5">
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
                        className={clsx(
                          'chip',
                          p.error ? 'border-red-400/40 text-red-300' : p.simulated ? 'border-line text-ink-muted' : 'border-radar/40 text-radar',
                        )}
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
                    {visible.slice(0, limit).map((o, i) => (
                      <FlightCard
                        key={o.id}
                        index={i % PAGE}
                        offer={o}
                        selected={selectedIds.has(o.id)}
                        onToggle={() => toggle(o)}
                        flags={flags.get(o.id) ?? {}}
                        passengers={{ adults: result.params.adults, children: result.params.children }}
                      />
                    ))}
                    {visible.length > limit && (
                      <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="btn-ghost mx-auto flex">
                        <ChevronDown className="h-4 w-4" /> Mostrar mais ({visible.length - limit} restantes)
                      </button>
                    )}
                    {hasAwards && (
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
        </div>

        {/* ============================== DATAS FLEXÍVEIS */}
        <div hidden={tab !== 'flex'}>
          <FlexPanel
            value={flexParams}
            onChange={setFlexParams}
            onSubmit={searchFlex}
            loading={flexLoading}
            error={flexError}
            maxDays={config.mode === 'live' ? 15 : 31}
          />
          <section className="mt-8 space-y-6" aria-live="polite">
            {flexLoading ? (
              <RadarLoader route={`${flexParams.origin} ⇄ ${flexParams.destination} · varrendo datas`} />
            ) : !flex ? (
              <div className="panel px-6 py-12 text-center">
                <CalendarRange className="mx-auto h-10 w-10 text-horizon" />
                <h2 className="mt-4 text-lg font-bold text-ink">Tem flexibilidade de datas?</h2>
                <p className="mx-auto mt-1 max-w-lg text-sm text-ink-muted">
                  Informe origem, destino e os períodos desejados. Mostramos os melhores valores de <b className="text-ink">ida</b> e de{' '}
                  <b className="text-ink">volta</b> por data e por companhia — selecione uma ida e uma volta para montar o orçamento.
                </p>
              </div>
            ) : (
              <>
                {flex.warnings.length > 0 && (
                  <details className="rounded-xl border border-instrument/30 bg-instrument/5 px-4 py-2.5 text-sm text-instrument">
                    <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" /> {flex.warnings.length} aviso(s) da busca
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                      {flex.warnings.map((w) => (
                        <li key={w} className="flex gap-2">
                          <Info className="mt-0.5 h-3 w-3 shrink-0 text-instrument" /> {w}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <FlexResults data={flex.outbound} selected={selectedIds} onToggle={toggle} />
                {flex.inbound && <FlexResults data={flex.inbound} selected={selectedIds} onToggle={toggle} />}
              </>
            )}
          </section>
        </div>
      </main>

      <SelectionBar
        count={selected.size}
        minPrice={selectedOffers.length ? Math.min(...selectedOffers.map((o) => o.sortPrice)) : undefined}
        onClear={() => setSelected(new Map())}
        onGenerate={generateQuote}
        onBudget={() => setBudgetOpen(true)}
        generating={generating}
      />

      <SettingsModal open={settingsOpen} config={config} onClose={() => setSettingsOpen(false)} onSave={save} onReset={reset} />
      <BudgetModal open={budgetOpen} offers={selectedOffers} onClose={() => setBudgetOpen(false)} />
    </>
  );
}
