# SkyQuote ✈️ — Buscador e Cotação de Passagens Aéreas

Aplicação Next.js (App Router) + TypeScript + Tailwind para pesquisar e comparar passagens em **dinheiro** e
**disponibilidade award (milhas) via Seats.aero**, com geração de **cotação em PDF**.

## Rodando

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de produção (compila sem erros)
```

Funciona 100% sem chaves: o **Mock Engine** gera dados realistas e determinísticos (mesma busca = mesmos resultados).

## Estrutura

```
app/
  page.tsx                 # dashboard (busca, resultados, filtros, seleção, PDF)
  api/search/route.ts      # POST — orquestra as buscas no servidor
  api/config/route.ts      # GET  — informa quais chaves existem no .env.local
components/                # SearchPanel, AirportInput, PassengerSelector, AirlineSelector,
                           # FlightCard (boarding pass), SelectionBar, SettingsModal, Header...
lib/
  airports.ts  airlines.ts # base de aeroportos (coord. + fuso IANA) e malha das cias / programas
  pdf.ts                   # geração do PDF (jsPDF + jspdf-autotable)
  time.ts format.ts rng.ts types.ts settings.ts
services/
  flightSearch.ts          # camada de serviço (modo simulação x ao vivo, fallback, ordenação)
  searchClient.ts          # cliente do front
  providers/
    mock.ts                # Mock Engine (rotas via hubs, fusos, preços dinâmicos, awards)
    seatsAero.ts           # Seats.aero Partner API (/partnerapi/search + trips)
    serpApi.ts             # SerpApi Google Flights (inclui ida+volta via departure_token)
    amadeus.ts             # Amadeus Flight Offers Search v2 (OAuth2)
    duffel.ts              # Duffel Offer Requests
```

## Chaves de API

Use o botão **Configurar APIs** (salva no `localStorage`) ou copie `.env.example` para `.env.local`:

| Variável | Uso |
|---|---|
| `SEATS_AERO_API_KEY` | Disponibilidade em milhas |
| `SERPAPI_KEY` | Tarifas Google Flights |
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` / `AMADEUS_ENV` | Tarifas Amadeus |
| `DUFFEL_ACCESS_TOKEN` | Tarifas Duffel (opcional) |

No modal, alterne **Simulação / Ao vivo**. No modo ao vivo, cada provedor sem chave ou com erro cai
automaticamente para o Mock Engine, com aviso na tela. As ofertas mostram o selo *Simulado* ou *Ao vivo*.

## Regras de negócio

- Resultados sempre do **menor para o maior valor** (alternável para menor duração).
- Resgates em milhas são comparados pelo **valor equivalente** = milhas × valor do milheiro (padrão R$ 20, configurável) + taxas.
- O PDF mantém a ordem do mais barato ao mais caro, com conexões (aeroporto, voo seguinte, tempo de solo) e rodapé de aviso.
