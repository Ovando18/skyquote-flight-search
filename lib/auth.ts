/**
 * Autenticação simples por senha única (APP_PASSWORD).
 * Compatível com o runtime Edge (middleware) — usa somente Web Crypto.
 *
 * O cookie guarda um HMAC derivado da senha: trocar a senha invalida todas as sessões.
 */
export const AUTH_COOKIE = 'sq_auth';
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export function configuredPassword(): string | undefined {
  const p = process.env.APP_PASSWORD;
  return p && p.trim() ? p.trim() : undefined;
}

/** Sem senha configurada: liberado apenas em desenvolvimento local. */
export function authDisabled(): boolean {
  return !configuredPassword() && process.env.NODE_ENV !== 'production';
}

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function tokenFor(password: string): Promise<string> {
  return hmacHex(`${password}|${process.env.AUTH_SECRET ?? 'skyquote'}`, 'skyquote-session-v1');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  const pw = configuredPassword();
  if (!pw || !token) return false;
  return safeEqual(token, await tokenFor(pw));
}

export async function checkPassword(input: string): Promise<boolean> {
  const pw = configuredPassword();
  if (!pw) return false;
  // Compara os HMACs (tempo constante) em vez das senhas em texto
  return safeEqual(await tokenFor(input), await tokenFor(pw));
}
