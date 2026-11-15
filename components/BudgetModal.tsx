'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Check, FileDown, LoaderCircle, Mail, MessageCircle, Plane, Receipt, TrendingUp, User, X } from 'lucide-react';
import type { ClientInfo, FlightOffer } from '@/lib/types';
import { CABIN_SHORT } from '@/lib/types';
import { duration, money, points, shortDate, stopsLabel, time } from '@/lib/format';
import { defaultBudgetSelection, deriveTrip, formatPhone, hasDateConflict, offerCostBRL } from '@/lib/trip';
import { budgetTotals, COMPANY_NAME, LOGO_URL } from '@/lib/budgetPdf';
import { AirlineBadge, SeatsAeroSeal } from './AirlineBadge';

interface Props {
  open: boolean;
  offers: FlightOffer[];
  onClose: () => void;
}

const EMPTY_CLIENT: ClientInfo = { name: '', phone: '', email: '' };

function OfferOption({ o, checked, onToggle }: { o: FlightOffer; checked: boolean; onToggle: () => void }) {
  return (
    <label
      className={clsx(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
        checked ? 'border-instrument/70 bg-instrument/10' : 'border-line bg-cockpit-800/50 hover:border-line-strong',
      )}
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
      <span
        className={clsx(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border',
          checked ? 'border-instrument bg-instrument text-cockpit-900' : 'border-line-strong bg-cockpit-900',
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <AirlineBadge code={o.airline} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
          {o.airlineName}
          {o.isAward && <SeatsAeroSeal compact />}
          <span className="text-[11px] font-normal text-ink-muted">
            {CABIN_SHORT[o.cabin]} · {o.fareBrand}
          </span>
        </div>
        {o.slices.map((s, i) => {
          const f = s.segments[0];
          const l = s.segments[s.segments.length - 1];
          return (
            <div key={i} className="mt-0.5 font-mono text-[11px] text-ink-muted">
              <span className="capitalize">{shortDate(f.departure)}</span> · {time(f.departure)} {f.from} → {time(l.arrival)} {l.to} ·{' '}
              {duration(s.durationMin)} · {stopsLabel(s)}
            </div>
          );
        })}
      </div>
      <div className="shrink-0 text-right font-mono">
        <div className="text-sm font-bold text-ink">{money(offerCostBRL(o))}</div>
        {o.isAward && o.miles && (
          <div className="text-[10px] text-instrument">
            {points(o.miles.pointsTotal)} mi + {money(o.miles.taxesTotal, o.miles.taxesCurrency)}
          </div>
        )}
      </div>
    </label>
  );
}

export default function BudgetModal({ open, offers, onClose }: Props) {
  const [client, setClient] = useState<ClientInfo>(EMPTY_CLIENT);
  const [included, setIncluded] = useState<string[]>([]);
  const [baseCost, setBaseCost] = useState(0);
  const [costTouched, setCostTouched] = useState(false);
  const [markup, setMarkup] = useState('');
  const [markupMode, setMarkupMode] = useState<'total' | 'per_pax'>('total');
  const [validityDays, setValidityDays] = useState(1);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sorted = useMemo(() => [...offers].sort((a, b) => a.sortPrice - b.sortPrice), [offers]);
  const chosen = sorted.filter((o) => included.includes(o.id));
  const autoCost = Math.round(chosen.reduce((s, o) => s + offerCostBRL(o), 0) * 100) / 100;

  useEffect(() => {
    if (!open) return;
    setIncluded(defaultBudgetSelection(offers));
    setCostTouched(false);
    setErr(null);
  }, [open, offers]);

  useEffect(() => {
    if (!costTouched) setBaseCost(autoCost);
  }, [autoCost, costTouched]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const trip = chosen.length ? deriveTrip(chosen) : null;
  const conflict = chosen.length > 1 && hasDateConflict(chosen);
  const pax = trip ? trip.adults + trip.children : 1;
  const markupNum = Number(markup.replace(/\./g, '').replace(',', '.')) || 0;
  const totals = budgetTotals({ baseCost, markup: markupNum, markupMode }, pax);

  const toggle = (id: string) => setIncluded((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const generate = async () => {
    if (!chosen.length) return setErr('Selecione ao menos uma opção de voo para o orçamento.');
    setErr(null);
    setBusy(true);
    try {
      const { generateBudgetPdf } = await import('@/lib/budgetPdf');
      await generateBudgetPdf({ client, offers: chosen, baseCost, markup: markupNum, markupMode, validityDays, notes });
    } catch (e) {
      setErr(`Falha ao gerar o orçamento: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-cockpit-950/80 p-3 backdrop-blur-sm sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="budget-title" className="panel relative my-4 w-full max-w-4xl animate-rise p-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt={COMPANY_NAME} className="h-11 w-11 rounded-full ring-2 ring-[#C49A3E]/60" />
            <div>
              <h2 id="budget-title" className="font-bold text-ink">
                Gerar orçamento para o cliente
              </h2>
              <p className="text-xs text-ink-muted">Modelo {COMPANY_NAME} · o cliente vê apenas o valor final</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-muted hover:bg-white/5 hover:text-ink" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {/* Cliente */}
            <section>
              <h3 className="label">
                <User className="h-3.5 w-3.5" /> Dados do cliente <span className="normal-case tracking-normal text-ink-faint">(opcionais)</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="field sm:col-span-2"
                  placeholder="Nome do cliente"
                  value={client.name}
                  onChange={(e) => setClient({ ...client, name: e.target.value })}
                />
                <div className="relative">
                  <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-radar" />
                  <input
                    className="field pl-9 font-mono"
                    placeholder="(67) 99999-9999"
                    inputMode="tel"
                    value={client.phone}
                    onChange={(e) => setClient({ ...client, phone: formatPhone(e.target.value) })}
                  />
                </div>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-horizon" />
                  <input
                    className="field pl-9"
                    type="email"
                    placeholder="cliente@email.com"
                    value={client.email}
                    onChange={(e) => setClient({ ...client, email: e.target.value })}
                  />
                </div>
              </div>
            </section>

            {/* Voos */}
            <section>
              <h3 className="label">
                <Plane className="h-3.5 w-3.5" /> Opção de voo do orçamento
              </h3>
              <p className="-mt-0.5 mb-2 text-[11px] text-ink-faint">
                Marque a melhor opção. Em datas flexíveis, marque uma ida e uma volta para compor a viagem.
              </p>
              <div className="scrollbar-thin max-h-72 space-y-2 overflow-y-auto pr-1">
                {sorted.map((o) => (
                  <OfferOption key={o.id} o={o} checked={included.includes(o.id)} onToggle={() => toggle(o.id)} />
                ))}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div>
                <label className="label" htmlFor="validity">
                  Validade (dias)
                </label>
                <input
                  id="validity"
                  type="number"
                  min={1}
                  max={30}
                  className="field font-mono"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>
              <div>
                <label className="label" htmlFor="notes">
                  Observações para o cliente
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  className="field resize-y"
                  placeholder="Ex.: parcelamento em até 10x, assento marcado incluso…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </section>
          </div>

          {/* Valores */}
          <aside className="space-y-4 rounded-2xl border border-line bg-cockpit-900/60 p-4">
            <h3 className="label !mb-0">
              <Receipt className="h-3.5 w-3.5" /> Composição do valor
            </h3>
            <div>
              <label className="label" htmlFor="cost">
                Custo das passagens (R$)
              </label>
              <input
                id="cost"
                type="number"
                step="0.01"
                min={0}
                className="field font-mono"
                value={baseCost}
                onChange={(e) => {
                  setCostTouched(true);
                  setBaseCost(Number(e.target.value) || 0);
                }}
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-ink-faint">
                <span>Automático: {money(autoCost)}</span>
                {costTouched && (
                  <button type="button" className="font-semibold text-horizon hover:underline" onClick={() => setCostTouched(false)}>
                    restaurar
                  </button>
                )}
              </div>
              {chosen.some((o) => o.isAward) && (
                <p className="mt-1 text-[11px] text-instrument">Milhas convertidas pelo valor do milheiro configurado + taxas.</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="markup">
                <TrendingUp className="h-3.5 w-3.5" /> Lucro da empresa (R$)
              </label>
              <input
                id="markup"
                inputMode="decimal"
                className="field font-mono text-instrument"
                placeholder="0,00"
                value={markup}
                onChange={(e) => setMarkup(e.target.value.replace(/[^\d.,]/g, ''))}
              />
              <div className="mt-2 inline-flex rounded-lg border border-line p-0.5 text-[11px]">
                {(
                  [
                    ['total', 'No total'],
                    ['per_pax', 'Por passageiro'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMarkupMode(id)}
                    className={clsx(
                      'rounded-md px-2.5 py-1 font-semibold',
                      markupMode === id ? 'bg-instrument text-cockpit-900' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <dl className="space-y-1.5 border-t border-line pt-3 font-mono text-xs">
              <div className="flex justify-between text-ink-muted">
                <dt>Custo</dt>
                <dd>{money(baseCost)}</dd>
              </div>
              <div className="flex justify-between text-instrument">
                <dt>Lucro{markupMode === 'per_pax' ? ` (${pax} pax)` : ''}</dt>
                <dd>+ {money(totals.profit)}</dd>
              </div>
              <div className="flex justify-between text-ink-faint">
                <dt>Margem</dt>
                <dd>{(totals.margin * 100).toFixed(1)}%</dd>
              </div>
              <div className="flex items-end justify-between border-t border-line pt-2">
                <dt className="font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Valor ao cliente</dt>
                <dd className="text-xl font-extrabold text-ink">{money(totals.total)}</dd>
              </div>
              <div className="text-right text-[11px] text-ink-muted">{money(totals.perPax)} por passageiro</div>
            </dl>
            <p className="text-[10px] leading-relaxed text-ink-faint">
              Custo, lucro e margem são internos — o PDF mostra ao cliente somente o valor final.
            </p>
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
          <p className={clsx('text-sm', err ? 'text-red-400' : conflict ? 'text-instrument' : 'text-ink-faint')}>
            {err ??
              (conflict
                ? 'Atenção: a volta selecionada é anterior à chegada da ida.'
                : `${chosen.length} opção(ões) no orçamento`)}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost py-2">
              Cancelar
            </button>
            <button type="button" onClick={generate} disabled={busy || !chosen.length} className="btn-amber py-2">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Gerar Orçamento PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
