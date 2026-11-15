import { NextResponse } from 'next/server';
import { searchFlex, validateFlex } from '@/services/flexSearch';
import type { ApiConfig, FlexParams } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { params: FlexParams; config?: Partial<ApiConfig> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }
  const err = validateFlex(body?.params);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  try {
    const result = await searchFlex(body.params, body.config ?? { mode: 'simulation', milheiroValue: 20 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: `Falha na busca flexível: ${(e as Error).message}` }, { status: 500 });
  }
}
