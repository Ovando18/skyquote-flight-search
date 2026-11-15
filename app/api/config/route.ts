import { NextResponse } from 'next/server';
import { serverKeyStatus } from '@/services/flightSearch';

export const dynamic = 'force-dynamic';

/** Informa (apenas como booleanos) quais chaves existem no .env.local do servidor */
export async function GET() {
  return NextResponse.json(serverKeyStatus());
}
