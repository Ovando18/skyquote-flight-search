export type TripType = 'roundtrip' | 'oneway';
export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';
export type ProviderId = 'mock' | 'amadeus' | 'serpapi' | 'duffel' | 'seats.aero';
export type SearchMode = 'simulation' | 'live';

export interface SearchParams {
  tripType: TripType;
  origin: string; // IATA
  destination: string; // IATA
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  adults: number;
  children: number; // 2 a 11 anos
  cabin: CabinClass;
  airlines: string[]; // códigos IATA das companhias selecionadas
  includeSeatsAero: boolean;
}

export interface Segment {
  carrier: string; // companhia comercializadora (IATA)
  operatingCarrier?: string; // quando diferente (codeshare)
  flightNumber: string; // ex.: LA8064
  from: string;
  to: string;
  departure: string; // horário local "YYYY-MM-DDTHH:mm"
  arrival: string; // horário local "YYYY-MM-DDTHH:mm"
  durationMin: number;
  aircraft?: string;
}

export interface Layover {
  airport: string;
  durationMin: number;
  overnight?: boolean;
}

export interface Slice {
  direction: 'outbound' | 'inbound';
  segments: Segment[];
  layovers: Layover[];
  durationMin: number;
}

export interface Baggage {
  personalItem: boolean;
  carryOnKg: number | null; // null = sem bagagem de mão
  checkedBags: number;
  checkedKg: number | null;
  /** Texto livre quando o provedor não detalha a franquia */
  note?: string;
}

export interface MilesInfo {
  program: string;
  programId: string;
  pointsPerPassenger: number;
  pointsTotal: number;
  taxesPerPassenger: number;
  taxesTotal: number;
  taxesCurrency: string;
  seatsRemaining?: number;
  /** Valor equivalente em BRL (milhas x valor do milheiro + taxas) */
  equivalentBRL: number;
}

export interface FlightOffer {
  id: string;
  provider: ProviderId;
  simulated: boolean;
  isAward: boolean;
  airline: string; // companhia validadora / principal
  airlineName: string;
  slices: Slice[];
  cabin: CabinClass;
  fareBrand: string;
  bookingClass?: string;
  baggage: Baggage;
  currency: string;
  /** Valor total em dinheiro p/ todos os passageiros (no caso de milhas: somente taxas) */
  totalPrice: number;
  pricePerAdult: number;
  pricePerChild?: number;
  miles?: MilesInfo;
  totalDurationMin: number;
  seatsRemaining?: number;
  /** Valor usado na ordenação (BRL). Para milhas = equivalente estimado. */
  sortPrice: number;
}

export interface ProviderRun {
  provider: ProviderId;
  simulated: boolean;
  count: number;
  error?: string;
}

export interface SearchResponse {
  offers: FlightOffer[];
  warnings: string[];
  providers: ProviderRun[];
  searchedAt: string;
  params: SearchParams;
}

export interface ApiConfig {
  mode: SearchMode;
  seatsAeroKey?: string;
  serpApiKey?: string;
  amadeusClientId?: string;
  amadeusClientSecret?: string;
  amadeusEnv?: 'test' | 'production';
  duffelToken?: string;
  /** Valor estimado do milheiro em R$ para comparar resgates com tarifas pagas */
  milheiroValue: number;
}

export interface ServerKeyStatus {
  seatsAero: boolean;
  serpApi: boolean;
  amadeus: boolean;
  duffel: boolean;
}

export const CABIN_LABELS: Record<CabinClass, string> = {
  economy: 'Econômica',
  premium_economy: 'Econômica Premium',
  business: 'Executiva (Business)',
  first: 'Primeira Classe',
};

export const CABIN_SHORT: Record<CabinClass, string> = {
  economy: 'Econômica',
  premium_economy: 'Premium',
  business: 'Executiva',
  first: 'Primeira',
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  mock: 'Motor de Simulação',
  amadeus: 'Amadeus',
  serpapi: 'Google Flights (SerpApi)',
  duffel: 'Duffel',
  'seats.aero': 'Seats.aero',
};
