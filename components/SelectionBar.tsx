'use client';

import { FileDown, LoaderCircle, Plane, Receipt, Trash2 } from 'lucide-react';
import { money } from '@/lib/format';

interface Props {
  count: number;
  minPrice?: number;
  onClear: () => void;
  onGenerate: () => void;
  onBudget: () => void;
  generating: boolean;
}

export default function SelectionBar({ count, minPrice, onClear, onGenerate, onBudget, generating }: Props) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-rise px-3 pb-3 sm:px-6 sm:pb-5">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 rounded-2xl border border-instrument/50 bg-cockpit-950/95 px-4 py-3 shadow-amber backdrop-blur sm:gap-3 md:flex-nowrap md:px-5">
        <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-instrument/15 text-instrument sm:grid">
          <Plane className="h-5 w-5 -rotate-45" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink">
            <span className="font-mono text-instrument">{count}</span> voo{count > 1 ? 's' : ''} selecionado{count > 1 ? 's' : ''}
          </div>
          <div className="truncate text-xs text-ink-muted">
            {minPrice !== undefined ? `A partir de ${money(minPrice)} · ` : ''}ordenados do menor para o maior valor
          </div>
        </div>
        <button type="button" onClick={onClear} className="btn-ghost px-3 py-2 text-xs" title="Limpar seleção">
          <Trash2 className="h-4 w-4" /> <span className="hidden lg:inline">Limpar seleção</span>
        </button>
        <button type="button" onClick={onGenerate} disabled={generating} className="btn-ghost py-2 text-xs">
          {generating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Cotação em PDF
        </button>
        <button type="button" onClick={onBudget} className="btn-amber w-full py-2.5 md:w-auto">
          <Receipt className="h-4 w-4" />
          Gerar Orçamento
        </button>
      </div>
    </div>
  );
}
