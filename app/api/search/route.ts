import { NextResponse } from 'next/server';
import { searchFlights, validateParams } from '@/services/flightSearch';
import type { ApiConfig, SearchParams } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { params: SearchParams; config?: Partial<ApiConfig> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }
  const err = validateParams(body?.params);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const config = body.config ?? { mode: 'simulation', milheiroValue: 20 };
    // Pequena latência no modo simulação para uma experiência realista de "varredura"
    if (config.mode !== 'live') await new Promise((r) => setTimeout(r, 650 + Math.random() * 500));
    const result = await searchFlights(body.params, config);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: `Falha na busca: ${(e as Error).message}` }, { status: 500 });
  }
}
