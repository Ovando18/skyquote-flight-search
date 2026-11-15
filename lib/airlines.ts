import type { CabinClass } from './types';
import type { Region } from './airports';

export interface Airline {
  code: string;
  name: string;
  shortName: string;
  group: 'national' | 'foreign';
  color: string;
  home: string; // país sede (ISO-2)
  hubs: string[];
  /** Destinos internacionais explícitos (usado principalmente pelas cias brasileiras) */
  intl?: string[];
  /** Cias brasileiras: aeroportos do Brasil que operam voos internacionais da cia */
  intlHubs?: string[];
  /** Regiões atendidas por cias estrangeiras */
  regions?: Region[];
  /** Portões de entrada no Brasil para cias estrangeiras */
  brGateways?: string[];
  /** Parceira doméstica de codeshare/interline para trechos alimentadores no Brasil */
  feeder?: string;
  cabins: CabinClass[];
  priceFactor: number;
  shortFleet: string[];
  longFleet: string[];
}

export const AIRLINES: Airline[] = [
  {
    code: 'LA', name: 'LATAM Airlines', shortName: 'LATAM', group: 'national', color: '#E8114B', home: 'BR',
    hubs: ['GRU', 'BSB', 'FOR'], intlHubs: ['GRU'],
    intl: ['MAD', 'BCN', 'LIS', 'FCO', 'MXP', 'FRA', 'LHR', 'MIA', 'MCO', 'JFK', 'EZE', 'SCL', 'LIM', 'BOG', 'MVD', 'ASU', 'CUN'],
    cabins: ['economy', 'premium_economy', 'business'], priceFactor: 1.05,
    shortFleet: ['A320', 'A321', 'A319', 'A320neo'], longFleet: ['787-9', '777-300ER', '787-8'],
  },
  {
    code: 'G3', name: 'GOL Linhas Aéreas', shortName: 'GOL', group: 'national', color: '#FF7020', home: 'BR',
    hubs: ['GRU', 'CGH', 'BSB', 'GIG'], intlHubs: ['GRU', 'BSB', 'GIG'],
    intl: ['EZE', 'AEP', 'SCL', 'MVD', 'ASU', 'MIA', 'MCO', 'CUN', 'LIM', 'BOG'],
    cabins: ['economy', 'premium_economy'], priceFactor: 0.92,
    shortFleet: ['737 MAX 8', '737-800'], longFleet: ['737 MAX 8'],
  },
  {
    code: 'AD', name: 'Azul Linhas Aéreas', shortName: 'Azul', group: 'national', color: '#2B6CE6', home: 'BR',
    hubs: ['VCP', 'CNF', 'REC'], intlHubs: ['VCP', 'REC', 'CNF'],
    intl: ['LIS', 'MCO', 'FLL', 'EZE', 'MVD', 'ASU'],
    cabins: ['economy', 'premium_economy', 'business'], priceFactor: 1.0,
    shortFleet: ['E195-E2', 'A320neo', 'ATR 72-600', 'A321neo'], longFleet: ['A330-900neo', 'A350-900'],
  },
  {
    code: 'IB', name: 'Iberia', shortName: 'Iberia', group: 'foreign', color: '#D7192D', home: 'ES',
    hubs: ['MAD'], regions: ['EU', 'NA', 'SA'], brGateways: ['GRU', 'GIG'], feeder: 'LA',
    cabins: ['economy', 'premium_economy', 'business'], priceFactor: 1.0,
    shortFleet: ['A320neo', 'A321XLR'], longFleet: ['A350-900', 'A330-200'],
  },
  {
    code: 'TP', name: 'TAP Air Portugal', shortName: 'TAP', group: 'foreign', color: '#00A350', home: 'PT',
    hubs: ['LIS'], regions: ['EU'], intl: ['MIA', 'JFK', 'EWR'],
    brGateways: ['GRU', 'GIG', 'BSB', 'CNF', 'REC', 'SSA', 'FOR', 'NAT', 'BEL', 'MCZ', 'FLN', 'POA'], feeder: 'AD',
    cabins: ['economy', 'business'], priceFactor: 0.95,
    shortFleet: ['A320neo', 'A321neo'], longFleet: ['A330-900neo', 'A321LR'],
  },
  {
    code: 'UX', name: 'Air Europa', shortName: 'Air Europa', group: 'foreign', color: '#0A6BC1', home: 'ES',
    hubs: ['MAD'], regions: ['EU'], intl: ['MIA', 'JFK', 'CUN', 'EZE', 'LIM', 'BOG', 'MVD', 'ASU'],
    brGateways: ['GRU', 'SSA', 'FOR'], feeder: 'G3',
    cabins: ['economy', 'premium_economy', 'business'], priceFactor: 0.9,
    shortFleet: ['737-800', 'E195'], longFleet: ['787-9', '787-8'],
  },
  {
    code: 'AA', name: 'American Airlines', shortName: 'American', group: 'foreign', color: '#0078D2', home: 'US',
    hubs: ['MIA', 'DFW', 'JFK'], regions: ['NA', 'EU'], intl: ['EZE', 'SCL', 'LIM', 'BOG'],
    brGateways: ['GRU', 'GIG'], feeder: 'G3',
    cabins: ['economy', 'premium_economy', 'business', 'first'], priceFactor: 1.1,
    shortFleet: ['A321neo', '737-800'], longFleet: ['777-300ER', '787-9'],
  },
  {
    code: 'UA', name: 'United Airlines', shortName: 'United', group: 'foreign', color: '#005DAA', home: 'US',
    hubs: ['IAH', 'EWR'], regions: ['NA', 'EU'], intl: ['EZE', 'SCL', 'LIM', 'BOG'],
    brGateways: ['GRU', 'GIG'], feeder: 'AD',
    cabins: ['economy', 'premium_economy', 'business'], priceFactor: 1.08,
    shortFleet: ['737 MAX 9', 'A321neo'], longFleet: ['787-10', '767-400ER'],
  },
  {
    code: 'DL', name: 'Delta Air Lines', shortName: 'Delta', group: 'foreign', color: '#C01933', home: 'US',
    hubs: ['ATL', 'JFK'], regions: ['NA', 'EU'], intl: ['EZE', 'SCL', 'LIM', 'BOG'],
    brGateways: ['GRU', 'GIG'], feeder: 'LA',
    cabins: ['economy', 'premium_economy', 'business'], priceFactor: 1.1,
    shortFleet: ['A321neo', '737-900ER'], longFleet: ['A350-900', 'A330-900neo'],
  },
  {
    code: 'CM', name: 'Copa Airlines', shortName: 'Copa', group: 'foreign', color: '#1C3F94', home: 'PA',
    hubs: ['PTY'], regions: ['SA', 'NA'],
    brGateways: ['GRU', 'GIG', 'BSB', 'CNF', 'POA', 'REC', 'SSA', 'FLN', 'MAO'], feeder: 'G3',
    cabins: ['economy', 'business'], priceFactor: 0.93,
    shortFleet: ['737 MAX 9', '737-800'], longFleet: ['737 MAX 9'],
  },
  {
    code: 'AR', name: 'Aerolíneas Argentinas', shortName: 'Aerolíneas', group: 'foreign', color: '#2A8BD3', home: 'AR',
    hubs: ['EZE', 'AEP'], regions: ['SA'], intl: ['MIA', 'MCO', 'JFK', 'MAD', 'FCO', 'BCN'],
    brGateways: ['GRU', 'GIG', 'SSA', 'FLN', 'POA', 'REC', 'NAT', 'BSB'], feeder: 'G3',
    cabins: ['economy', 'business'], priceFactor: 0.9,
    shortFleet: ['737 MAX 8', '737-800'], longFleet: ['A330-200'],
  },
  {
    code: 'H2', name: 'Sky Airline', shortName: 'Sky', group: 'foreign', color: '#6A4FB6', home: 'CL',
    hubs: ['SCL', 'LIM'], regions: ['SA'], brGateways: ['GRU', 'GIG', 'FLN', 'SSA'],
    cabins: ['economy'], priceFactor: 0.75,
    shortFleet: ['A320neo', 'A321neo'], longFleet: ['A321neo'],
  },
  {
    code: 'AF', name: 'Air France', shortName: 'Air France', group: 'foreign', color: '#1F3C88', home: 'FR',
    hubs: ['CDG'], regions: ['EU', 'NA', 'ME'], intl: ['EZE', 'SCL', 'LIM', 'BOG'],
    brGateways: ['GRU', 'GIG', 'FOR'], feeder: 'G3',
    cabins: ['economy', 'premium_economy', 'business', 'first'], priceFactor: 1.12,
    shortFleet: ['A220-300', 'A320'], longFleet: ['777-300ER', 'A350-900', '787-9'],
  },
  {
    code: 'KL', name: 'KLM Royal Dutch Airlines', shortName: 'KLM', group: 'foreign', color: '#00A1DE', home: 'NL',
    hubs: ['AMS'], regions: ['EU', 'NA', 'ME'], intl: ['EZE', 'SCL', 'LIM', 'BOG'],
    brGateways: ['GRU', 'GIG'], feeder: 'G3',
    cabins: ['economy', 'premium_economy', 'business'], priceFactor: 1.08,
    shortFleet: ['737-800', 'E195-E2'], longFleet: ['787-10', '777-200ER'],
  },
  {
    code: 'LH', name: 'Lufthansa', shortName: 'Lufthansa', group: 'foreign', color: '#E0A800', home: 'DE',
    hubs: ['FRA'], regions: ['EU', 'NA', 'ME'], intl: ['EZE', 'BOG'],
    brGateways: ['GRU', 'GIG'], feeder: 'LA',
    cabins: ['economy', 'premium_economy', 'business', 'first'], priceFactor: 1.15,
    shortFleet: ['A320neo', 'A321'], longFleet: ['747-8', 'A350-900', '787-9'],
  },
  {
    code: 'BA', name: 'British Airways', shortName: 'British', group: 'foreign', color: '#2E5C99', home: 'GB',
    hubs: ['LHR'], regions: ['EU', 'NA', 'ME'], intl: ['EZE', 'SCL', 'LIM'],
    brGateways: ['GRU', 'GIG'], feeder: 'LA',
    cabins: ['economy', 'premium_economy', 'business', 'first'], priceFactor: 1.12,
    shortFleet: ['A320neo', 'A321neo'], longFleet: ['777-300ER', '787-10', 'A350-1000'],
  },
  {
    code: 'EK', name: 'Emirates', shortName: 'Emirates', group: 'foreign', color: '#D71921', home: 'AE',
    hubs: ['DXB'], regions: ['EU', 'NA', 'ME'], intl: ['EZE'],
    brGateways: ['GRU', 'GIG'], feeder: 'G3',
    cabins: ['economy', 'premium_economy', 'business', 'first'], priceFactor: 1.2,
    shortFleet: ['777-300ER'], longFleet: ['A380-800', '777-300ER'],
  },
  {
    code: 'QR', name: 'Qatar Airways', shortName: 'Qatar', group: 'foreign', color: '#7A1236', home: 'QA',
    hubs: ['DOH'], regions: ['EU', 'NA', 'ME'], intl: ['EZE'],
    brGateways: ['GRU'], feeder: 'LA',
    cabins: ['economy', 'business', 'first'], priceFactor: 1.18,
    shortFleet: ['A320', '787-8'], longFleet: ['A350-1000', '777-300ER', 'A380-800'],
  },
];

const BY_CODE = new Map(AIRLINES.map((a) => [a.code, a]));

export function getAirline(code: string): Airline | undefined {
  return BY_CODE.get(code.toUpperCase());
}

export function airlineName(code: string): string {
  return getAirline(code)?.name ?? code;
}

export function airlineColor(code: string): string {
  return getAirline(code)?.color ?? '#38BDF8';
}

export const NATIONAL_AIRLINES = AIRLINES.filter((a) => a.group === 'national');
export const FOREIGN_AIRLINES = AIRLINES.filter((a) => a.group === 'foreign');
export const DEFAULT_AIRLINES = NATIONAL_AIRLINES.map((a) => a.code);

/** Programas de fidelidade monitorados pelo Seats.aero e suas parceiras de resgate */
export interface LoyaltyProgram {
  id: string;
  name: string;
  partners: string[];
  factor: number; // custo relativo em milhas
  highTaxes?: boolean;
}

export const LOYALTY_PROGRAMS: LoyaltyProgram[] = [
  { id: 'smiles', name: 'Smiles', partners: ['G3', 'AF', 'KL', 'EK', 'CM', 'AR', 'AA'], factor: 1.2 },
  { id: 'azul', name: 'Azul Fidelidade', partners: ['AD', 'TP', 'UA'], factor: 1.1 },
  { id: 'aeroplan', name: 'Air Canada Aeroplan', partners: ['UA', 'LH', 'TP', 'CM'], factor: 0.9 },
  { id: 'american', name: 'AAdvantage', partners: ['AA', 'BA', 'IB', 'QR'], factor: 0.85, highTaxes: true },
  { id: 'flyingblue', name: 'Flying Blue', partners: ['AF', 'KL', 'DL', 'G3'], factor: 1.0, highTaxes: true },
  { id: 'united', name: 'United MileagePlus', partners: ['UA', 'LH', 'TP', 'CM', 'AD'], factor: 1.05 },
  { id: 'delta', name: 'Delta SkyMiles', partners: ['DL', 'LA', 'AF', 'KL'], factor: 1.3 },
  { id: 'qatar', name: 'Qatar Privilege Club', partners: ['QR', 'BA', 'IB', 'AA', 'LA'], factor: 0.8, highTaxes: true },
  { id: 'virginatlantic', name: 'Virgin Atlantic Flying Club', partners: ['DL', 'AF', 'KL'], factor: 0.7, highTaxes: true },
  { id: 'lifemiles', name: 'Avianca LifeMiles', partners: ['UA', 'LH', 'TP', 'CM'], factor: 0.85 },
  { id: 'connectmiles', name: 'Copa ConnectMiles', partners: ['CM', 'UA', 'LH', 'TP'], factor: 0.95 },
  { id: 'emirates', name: 'Emirates Skywards', partners: ['EK'], factor: 1.1, highTaxes: true },
];

export function programName(id: string): string {
  return LOYALTY_PROGRAMS.find((p) => p.id === id)?.name ?? id;
}
