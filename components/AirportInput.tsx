'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import clsx from 'clsx';
import { airportLabel, getAirport, searchAirports } from '@/lib/airports';

interface Props {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  exclude?: string;
}

const COUNTRY_FLAG: Record<string, string> = {
  BR: '🇧🇷', AR: '🇦🇷', CL: '🇨🇱', PE: '🇵🇪', CO: '🇨🇴', UY: '🇺🇾', PY: '🇵🇾', PA: '🇵🇦', US: '🇺🇸', MX: '🇲🇽',
  ES: '🇪🇸', PT: '🇵🇹', FR: '🇫🇷', NL: '🇳🇱', DE: '🇩🇪', GB: '🇬🇧', IT: '🇮🇹', CH: '🇨🇭', AE: '🇦🇪', QA: '🇶🇦',
};

export default function AirportInput({ label, icon, value, onChange, placeholder, exclude }: Props) {
  const id = useId();
  const [text, setText] = useState(value ? airportLabel(value) : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value ? airportLabel(value) : '');
  }, [value]);

  const results = useMemo(() => {
    const q = text === airportLabel(value) ? '' : text;
    return searchAirports(q, 9).filter((a) => a.code !== exclude);
  }, [text, value, exclude]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) commitText();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  });

  function choose(code: string) {
    onChange(code);
    setText(airportLabel(code));
    setOpen(false);
  }

  function commitText() {
    if (!open) return;
    setOpen(false);
    const t = text.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(t)) {
      // Permite IATA fora da lista (útil no modo ao vivo)
      onChange(t);
      setText(airportLabel(t));
    } else if (results.length && t && !getAirport(value)) {
      choose(results[0].code);
    } else {
      setText(value ? airportLabel(value) : '');
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="label">
        {icon}
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="field pr-14 font-medium"
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          onFocus={(e) => {
            setOpen(true);
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              if (open && results[active]) {
                e.preventDefault();
                choose(results[active].code);
              }
            } else if (e.key === 'Escape') {
              setOpen(false);
              setText(value ? airportLabel(value) : '');
            } else if (e.key === 'Tab') {
              if (open && results[active] && text !== airportLabel(value)) choose(results[active].code);
              else setOpen(false);
            }
          }}
        />
        {value && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-horizon/30 bg-horizon/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-horizon">
            {value}
          </span>
        )}
      </div>
      {open && results.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="scrollbar-thin absolute z-40 mt-1.5 max-h-80 w-full min-w-[280px] overflow-auto rounded-xl border border-line bg-panel-2 p-1 shadow-card"
        >
          {results.map((a, i) => (
            <li
              key={a.code}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(a.code);
              }}
              onMouseEnter={() => setActive(i)}
              className={clsx(
                'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2',
                i === active ? 'bg-horizon/10' : 'hover:bg-white/5',
              )}
            >
              <span className="w-11 shrink-0 rounded-md bg-cockpit-900 py-1 text-center font-mono text-xs font-bold text-horizon">
                {a.code}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{a.city}</span>
                <span className="block truncate text-[11px] text-ink-muted">{a.name}</span>
              </span>
              <span className="text-base" aria-hidden>
                {COUNTRY_FLAG[a.country] ?? <MapPin className="h-3.5 w-3.5" />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
