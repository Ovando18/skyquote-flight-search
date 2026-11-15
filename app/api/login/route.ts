import { NextResponse } from 'next/server';
import { AUTH_COOKIE, AUTH_MAX_AGE, checkPassword, configuredPassword, tokenFor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const pw = configuredPassword();
  if (!pw) {
    return NextResponse.json(
      { error: 'Senha não configurada no servidor. Defina a variável APP_PASSWORD na hospedagem.' },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!(await checkPassword(password))) {
    // Atraso para dificultar tentativas em sequência
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await tokenFor(pw), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}
