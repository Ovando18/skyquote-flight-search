'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { Eye, EyeOff, LoaderCircle, Lock, LogIn, Plane } from 'lucide-react';
import { COMPANY_NAME, LOGO_URL } from '@/lib/brand';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return setError('Digite a senha.');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Não foi possível entrar.');
      window.location.href = '/';
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={LOGO_URL} alt={COMPANY_NAME} className="h-28 w-28 rounded-full shadow-amber ring-2 ring-[#C49A3E]/60" />
          <div className="mt-4 flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink">
            <Plane className="h-4 w-4 -rotate-45 text-horizon" />
            Sky<span className="-ml-2 text-horizon">Quote</span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">Acesso restrito · {COMPANY_NAME}</p>
        </div>

        <form onSubmit={submit} className="panel space-y-4 p-6">
          <div>
            <label htmlFor="password" className="label">
              <Lock className="h-3.5 w-3.5" /> Senha de acesso
            </label>
            <div className="relative">
              <input
                id="password"
                type={show ? 'text' : 'password'}
                autoFocus
                autoComplete="current-password"
                className="field pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
                aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full py-3">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Entrar
          </button>
          <p className="text-center text-[11px] text-ink-faint">O acesso fica salvo neste aparelho por 30 dias.</p>
        </form>
      </div>
    </main>
  );
}
