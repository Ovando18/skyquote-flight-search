import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, authDisabled, isValidToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (authDisabled() || PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  if (await isValidToken(req.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  // Tudo, exceto arquivos estáticos do Next, favicon e a pasta da marca (logo usada na tela de login)
  matcher: ['/((?!_next/static|_next/image|favicon.svg|brand/).*)'],
};
