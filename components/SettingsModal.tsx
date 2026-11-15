'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff, FlaskConical, KeyRound, Radar, RotateCcw, Satellite, Save, Server, X } from 'lucide-react';
import type { ApiConfig, ServerKeyStatus } from '@/lib/types';
import { fetchServerKeys } from '@/services/searchClient';

interface Props {
  open: boolean;
  config: ApiConfig;
  onClose: () => void;
  onSave: (c: ApiConfig) => void;
  onReset: () => void;
}

function SecretField({
  label,
  envName,
  value,
  onChange,
  serverHas,
  placeholder,
}: {
  label: string;
  envName: string;
  value: string;
  onChange: (v: string) => void;
  serverHas?: boolean;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="label !mb-0">{label}</label>
        <span className="flex items-center gap-1.5">
          <code className="rounded bg-cockpit-950 px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">{envName}</code>
          {serverHas && (
            <span className="chip border-radar/40 text-radar" title="Variável encontrada no .env.local do servidor">
              <Server className="h-3 w-3" /> .env
            </span>
          )}
        </span>
      </div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="field pr-10 font-mono text-xs"
          value={value}
          autoComplete="off"
          spellCheck={false}
          placeholder={serverHas ? 'Usando valor do .env.local' : (placeholder ?? 'Cole sua chave aqui')}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
          aria-label={show ? 'Ocultar' : 'Mostrar'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function SettingsModal({ open, config, onClose, onSave, onReset }: Props) {
  const [draft, setDraft] = useState<ApiConfig>(config);
  const [server, setServer] = useState<ServerKeyStatus | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(config);
      fetchServerKeys().then(setServer);
    }
  }, [open, config]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const set = (patch: Partial<ApiConfig>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-cockpit-950/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="panel relative my-6 w-full max-w-2xl animate-rise p-0"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-horizon/40 bg-horizon/10 text-horizon">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h2 id="settings-title" className="font-bold text-ink">
                Configurar APIs
              </h2>
              <p className="text-xs text-ink-muted">Chaves salvas apenas neste navegador (localStorage)</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-muted hover:bg-white/5 hover:text-ink" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* Modo */}
          <div>
            <span className="label">Modo de operação</span>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: 'simulation', title: 'Simulação / Teste', desc: 'Mock Engine com dados realistas e determinísticos', icon: FlaskConical, color: 'instrument' },
                  { id: 'live', title: 'Consultas ao vivo', desc: 'Usa as chaves configuradas (fallback para simulação)', icon: Satellite, color: 'radar' },
                ] as const
              ).map((m) => {
                const active = draft.mode === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => set({ mode: m.id })}
                    className={clsx(
                      'rounded-xl border p-3 text-left transition',
                      active
                        ? m.color === 'radar'
                          ? 'border-radar bg-radar/10'
                          : 'border-instrument bg-instrument/10'
                        : 'border-line bg-cockpit-800/60 hover:border-line-strong',
                    )}
                  >
                    <Icon className={clsx('mb-2 h-5 w-5', m.color === 'radar' ? 'text-radar' : 'text-instrument')} />
                    <div className="text-sm font-semibold text-ink">{m.title}</div>
                    <div className="text-[11px] text-ink-muted">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seats.aero */}
          <section className="space-y-3 rounded-xl border border-instrument/30 bg-instrument/5 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-instrument">
              <Radar className="h-4 w-4" /> Seats.aero · Milhas
            </h3>
            <SecretField
              label="Partner API Key"
              envName="SEATS_AERO_API_KEY"
              value={draft.seatsAeroKey ?? ''}
              serverHas={server?.seatsAero}
              onChange={(v) => set({ seatsAeroKey: v })}
            />
            <div>
              <label className="label" htmlFor="milheiro">
                Valor do milheiro (R$) — usado para comparar milhas x dinheiro
              </label>
              <input
                id="milheiro"
                type="number"
                min={1}
                step={0.5}
                className="field w-40 font-mono"
                value={draft.milheiroValue}
                onChange={(e) => set({ milheiroValue: Math.max(1, Number(e.target.value) || 20) })}
              />
            </div>
          </section>

          {/* Tarifas */}
          <section className="space-y-3 rounded-xl border border-line p-4">
            <h3 className="text-sm font-bold text-ink">Tarifas em dinheiro</h3>
            <SecretField
              label="SerpApi (Google Flights)"
              envName="SERPAPI_KEY"
              value={draft.serpApiKey ?? ''}
              serverHas={server?.serpApi}
              onChange={(v) => set({ serpApiKey: v })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <SecretField
                label="Amadeus Client ID"
                envName="AMADEUS_CLIENT_ID"
                value={draft.amadeusClientId ?? ''}
                serverHas={server?.amadeus}
                onChange={(v) => set({ amadeusClientId: v })}
              />
              <SecretField
                label="Amadeus Client Secret"
                envName="AMADEUS_CLIENT_SECRET"
                value={draft.amadeusClientSecret ?? ''}
                serverHas={server?.amadeus}
                onChange={(v) => set({ amadeusClientSecret: v })}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="label !mb-0">Ambiente Amadeus</span>
              {(['test', 'production'] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => set({ amadeusEnv: env })}
                  className={clsx(
                    'rounded-lg border px-3 py-1 font-mono text-xs',
                    draft.amadeusEnv === env ? 'border-horizon bg-horizon/10 text-horizon' : 'border-line text-ink-muted',
                  )}
                >
                  {env}
                </button>
              ))}
            </div>
            <SecretField
              label="Duffel Access Token (opcional)"
              envName="DUFFEL_ACCESS_TOKEN"
              value={draft.duffelToken ?? ''}
              serverHas={server?.duffel}
              onChange={(v) => set({ duffelToken: v })}
            />
          </section>

          <p className="text-[11px] leading-relaxed text-ink-faint">
            As chaves são enviadas apenas para a rota interna <code className="font-mono">/api/search</code> deste próprio
            servidor, que consulta os provedores. Alternativamente, defina-as no arquivo <code className="font-mono">.env.local</code>{' '}
            (veja <code className="font-mono">.env.example</code>) — valores preenchidos aqui têm prioridade.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="btn-ghost py-2 text-xs"
          >
            <RotateCcw className="h-4 w-4" /> Limpar chaves
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost py-2">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draft);
                onClose();
              }}
              className="btn-primary py-2"
            >
              <Save className="h-4 w-4" /> Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
