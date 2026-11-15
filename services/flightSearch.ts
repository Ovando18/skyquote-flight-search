/**
 * Orquestrador do motor de busca (executa no servidor — API Route /api/search).
 *
 * Modo "simulation": usa somente o Mock Engine.
 * Modo "live": consulta os provedores com chave configurada (localStorage -> request, ou .env.local).
 *   - Tarifas em dinheiro: Amadeus, SerpApi (Google Flights) e/ou Duffel, em paralelo.
 *   - Milhas: Seats.aero Partner API.
 *   - Qualquer provedor que falhe cai para o Mock Engine com aviso.
 */
import type { ApiConfig, FlightOffer, ProviderRun, SearchParams, SearchResponse, ServerKeyStatus } from '@/lib/types';
import { PROVIDER_LABELS } from '@/lib/types';
import { getAirport } from '@/lib/airports';
import { mockAwardOffers, mockCashOffers } from './providers/mock';
import { searchSeatsAero } from './providers/seatsAero';
import { searchSerpApi } from './providers/serpApi';
import { searchAmadeus } from './providers/amadeus';
import { searchDuffel } from './providers/duffel';

export function resolveKeys(config: Partial<ApiConfig>) {
  const pick = (a?: string, b?: string) => (a && a.trim()) || (b && b.trim()) || undefined;
  return {
    seatsAero: pick(config.seatsAeroKey, process.env.SEATS_AERO_API_KEY),
    serpApi: pick(config.serpApiKey, process.env.SERPAPI_KEY),
    amadeusId: pick(config.amadeusClientId, process.env.AMADEUS_CLIENT_ID),
    amadeusSecret: pick(config.amadeusClientSecret, process.env.AMADEUS_CLIENT_SECRET),
    amadeusEnv: (config.amadeusEnv ?? (process.env.AMADEUS_ENV as 'test' | 'production' | undefined) ?? 'test') as
      | 'test'
      | 'production',
    duffel: pick(config.duffelToken, process.env.DUFFEL_ACCESS_TOKEN),
  };
}

export function serverKeyStatus(): ServerKeyStatus {
  const k = resolveKeys({});
  return { seatsAero: !!k.seatsAero, serpApi: !!k.serpApi, amadeus: !!(k.amadeusId && k.amadeusSecret), duffel: !!k.duffel };
}

export function validateParams(p: SearchParams): string | null {
  if (!p || typeof p !== 'object') return 'Parâmetros inválidos.';
  if (!/^[A-Z]{3}$/.test(p.origin ?? '') || !/^[A-Z]{3}$/.test(p.destination ?? ''))
    return 'Informe aeroportos de origem e destino válidos (código IATA).';
  if (p.origin === p.destination) return 'Origem e destino devem ser diferentes.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.departDate ?? '')) return 'Data de ida inválida.';
  if (p.tripType === 'roundtrip') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.returnDate ?? '')) return 'Informe a data de volta.';
    if (p.returnDate! < p.departDate) return 'A data de volta deve ser igual ou posterior à data de ida.';
  }
  if (!(p.adults >= 1 && p.adults <= 9) || !(p.children >= 0 && p.adults + p.children <= 9))
    return 'Quantidade de passageiros inválida (máximo 9).';
  if (!p.airlines?.length && !p.includeSeatsAero) return 'Selecione ao menos uma companhia aérea ou o Seats.aero.';
  return null;
}

type Runner = { provider: FlightOffer['provider']; run: () => Promise<FlightOffer[]> };

export async function searchFlights(params: SearchParams, config: Partial<ApiConfig>): Promise<SearchResponse> {
  const warnings: string[] = [];
  const providers: ProviderRun[] = [];
  const offers: FlightOffer[] = [];
  const live = config.mode === 'live';
  const keys = resolveKeys(config);
  const milheiro = config.milheiroValue && config.milheiroValue > 0 ? config.milheiroValue : 20;
  const roundtripParams: SearchParams =
    params.tripType === 'oneway' ? { ...params, returnDate: undefined } : params;

  const useMockCash = (reason?: string) => {
    if (reason) warnings.push(reason);
    if (!getAirport(params.origin) || !getAirport(params.destination)) {
      warnings.push('Simulação disponível apenas para os aeroportos da lista de autocomplete.');
      return;
    }
    const r = mockCashOffers(roundtripParams);
    offers.push(...r.offers);
    warnings.push(...r.notes);
    providers.push({ provider: 'mock', simulated: true, count: r.offers.length });
  };

  // ----- Tarifas em dinheiro
  if (params.airlines.length) {
    const runners: Runner[] = [];
    if (live) {
      if (keys.amadeusId && keys.amadeusSecret)
        runners.push({
          provider: 'amadeus',
          run: () => searchAmadeus(roundtripParams, keys.amadeusId!, keys.amadeusSecret!, keys.amadeusEnv),
        });
      if (keys.serpApi) runners.push({ provider: 'serpapi', run: () => searchSerpApi(roundtripParams, keys.serpApi!) });
      if (keys.duffel) runners.push({ provider: 'duffel', run: () => searchDuffel(roundtripParams, keys.duffel!) });
    }

    if (!runners.length) {
      useMockCash(
        live ? 'Modo ao vivo ativo, mas nenhuma chave de tarifas (Amadeus / SerpApi / Duffel) foi configurada — exibindo tarifas simuladas.' : undefined,
      );
    } else {
      const results = await Promise.allSettled(runners.map((r) => r.run()));
      let ok = 0;
      results.forEach((res, i) => {
        const p = runners[i].provider;
        if (res.status === 'fulfilled') {
          ok++;
          const filtered = res.value.filter(
            (o) => params.airlines.includes(o.airline) || o.slices.some((s) => s.segments.some((g) => params.airlines.includes(g.carrier))),
          );
          offers.push(...filtered);
          providers.push({ provider: p, simulated: filtered.some((o) => o.simulated), count: filtered.length });
        } else {
          const msg = (res.reason as Error)?.message ?? 'erro desconhecido';
          providers.push({ provider: p, simulated: false, count: 0, error: msg });
          warnings.push(`${PROVIDER_LABELS[p]}: falha na consulta (${msg}).`);
        }
      });
      if (!ok) useMockCash('Todas as consultas ao vivo falharam — exibindo tarifas simuladas como alternativa.');
    }
  }

  // ----- Milhas (Seats.aero)
  if (params.includeSeatsAero) {
    const runMockAward = (reason?: string) => {
      if (reason) warnings.push(reason);
      const r = mockAwardOffers(roundtripParams, milheiro);
      offers.push(...r.offers);
      warnings.push(...r.notes);
      providers.push({ provider: 'seats.aero', simulated: true, count: r.offers.length });
    };
    if (live && keys.seatsAero) {
      try {
        const r = await searchSeatsAero(roundtripParams, keys.seatsAero, milheiro);
        offers.push(...r);
        providers.push({ provider: 'seats.aero', simulated: false, count: r.length });
        if (!r.length) warnings.push('Seats.aero: nenhuma disponibilidade award encontrada para estas datas.');
      } catch (e) {
        runMockAward(`Seats.aero: falha na consulta (${(e as Error).message}) — exibindo disponibilidade simulada.`);
      }
    } else {
      runMockAward(live ? 'Seats.aero sem chave configurada — exibindo disponibilidade award simulada.' : undefined);
    }
  }

  // Deduplica e ordena do menor para o maior valor
  const seen = new Set<string>();
  const unique = offers.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
  unique.sort((a, b) => a.sortPrice - b.sortPrice || a.totalDurationMin - b.totalDurationMin);

  return {
    offers: unique,
    warnings: Array.from(new Set(warnings)),
    providers,
    searchedAt: new Date().toISOString(),
    params,
  };
}
