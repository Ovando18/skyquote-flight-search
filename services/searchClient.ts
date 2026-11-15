import type { ApiConfig, SearchParams, SearchResponse, ServerKeyStatus } from '@/lib/types';

export async function runSearch(params: SearchParams, config: ApiConfig): Promise<SearchResponse> {
  const res = await fetch('/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ params, config }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
  return data as SearchResponse;
}

export async function fetchServerKeys(): Promise<ServerKeyStatus | null> {
  try {
    const res = await fetch('/api/config', { cache: 'no-store' });
    return res.ok ? ((await res.json()) as ServerKeyStatus) : null;
  } catch {
    return null;
  }
}
