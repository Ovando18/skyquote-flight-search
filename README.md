# SkyQuote ✈️ — Buscador e Cotação de Passagens Aéreas

Aplicação Next.js (App Router) + TypeScript + Tailwind para pesquisar e comparar passagens em **dinheiro** e
**disponibilidade award (milhas) via Seats.aero**, com geração de **cotação em PDF** e **orçamento para o cliente**
(modelo Renda & Rotas, com logo).

## Funcionalidades

- **Busca por data** — retorna todos os voos possíveis da rota, de **todas as companhias**; filtro por companhia,
  paradas e dinheiro/milhas nos resultados. Seats.aero opcional.
- **Datas flexíveis** — informe origem, destino e um período de ida (e de volta): mostra os melhores valores de
  **ida por data e companhia** e depois os de **volta por data e companhia** (calendário de preços, top 6 e matriz
  data × companhia). Até 31 dias por período na simulação / 15 no modo ao vivo.
- **Gerar Orçamento** — dados do cliente (nome, WhatsApp, e-mail — opcionais), escolha da opção de voo (ou ida +
  volta das datas flexíveis), custo automático editável e **lucro da empresa** (no total ou por passageiro).
  O PDF mostra ao cliente apenas o valor final. Logo em `public/brand/logo-renda-rotas.png`.
- **Cotação em PDF** — documento técnico comparativo das opções selecionadas.

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
  api/flex/route.ts        # POST — busca de datas flexíveis
  api/config/route.ts      # GET  — informa quais chaves existem no .env.local
components/                # SearchPanel, AirportInput, PassengerSelector, AirlineSelector,
                           # FlightCard (boarding pass), SelectionBar, SettingsModal, Header...
lib/
  airports.ts  airlines.ts # base de aeroportos (coord. + fuso IANA) e malha das cias / programas
  pdf.ts                   # cotação técnica em PDF (jsPDF + jspdf-autotable)
  budgetPdf.ts             # orçamento ao cliente (modelo Renda & Rotas)
  trip.ts                  # monta a viagem a partir das opções escolhidas
  time.ts format.ts rng.ts types.ts settings.ts
services/
  flightSearch.ts          # camada de serviço (modo simulação x ao vivo, fallback, ordenação)
  flexSearch.ts            # varredura de datas: melhor oferta por data e companhia
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

## Senha de acesso

O sistema é protegido por uma senha única, definida na variável de ambiente **`APP_PASSWORD`** da hospedagem.
- A verificação é feita no servidor (middleware), e as APIs internas também ficam bloqueadas sem login.
- O login fica salvo no aparelho por 30 dias. O botão **Sair** fica no canto superior direito.
- Trocar o valor de `APP_PASSWORD` desconecta todos os aparelhos.
- Em produção, sem `APP_PASSWORD`, o site fica bloqueado. No `npm run dev` local, sem senha, o acesso fica liberado.

## Publicar no Netlify

1. Netlify > **Add new site > Import an existing project > GitHub** > escolha `skyquote-flight-search`.
2. Mantenha as configurações detectadas (o `netlify.toml` já define build e Node 22).
3. Em **Environment variables**, adicione `APP_PASSWORD` com a senha desejada.
4. **Deploy**. Cada envio para a branch `main` publica automaticamente.
