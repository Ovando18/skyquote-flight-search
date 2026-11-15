import type { ApiConfig, FlexParams, FlexResponse, SearchParams, SearchResponse, ServerKeyStatus } from '@/lib/types';

export async function runSearch(params: SearchParams, config: ApiConfig): Promise<SearchResponse> {
  const res = await fetch('/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ params, config }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.href = '/login';
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

export async function runFlexSearch(params: FlexParams, config: ApiConfig): Promise<FlexResponse> {
  const res = await fetch('/api/flex', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ params, config }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.href = '/login';
  if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
  return data as FlexResponse;
}
