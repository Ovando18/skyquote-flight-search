export type Region = 'BR' | 'SA' | 'NA' | 'EU' | 'ME';

export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string; // ISO-2
  region: Region;
  tz: string; // IANA
  lat: number;
  lon: number;
  /** 1 = regional, 2 = grande, 3 = hub internacional */
  size: 1 | 2 | 3;
  domesticOnly?: boolean;
}

const A = (
  code: string,
  city: string,
  name: string,
  country: string,
  region: Region,
  tz: string,
  lat: number,
  lon: number,
  size: 1 | 2 | 3,
  domesticOnly = false,
): Airport => ({ code, city, name, country, region, tz, lat, lon, size, domesticOnly });

export const AIRPORTS: Airport[] = [
  // Brasil
  A('CGR', 'Campo Grande', 'Aeroporto Internacional de Campo Grande', 'BR', 'BR', 'America/Campo_Grande', -20.469, -54.6725, 1),
  A('GRU', 'São Paulo/Guarulhos', 'Aeroporto Internacional de Guarulhos', 'BR', 'BR', 'America/Sao_Paulo', -23.4356, -46.4731, 3),
  A('CGH', 'São Paulo/Congonhas', 'Aeroporto de Congonhas', 'BR', 'BR', 'America/Sao_Paulo', -23.6261, -46.6564, 2, true),
  A('VCP', 'Campinas/Viracopos', 'Aeroporto Internacional de Viracopos', 'BR', 'BR', 'America/Sao_Paulo', -23.0074, -47.1345, 2),
  A('GIG', 'Rio de Janeiro/Galeão', 'Aeroporto Internacional Tom Jobim', 'BR', 'BR', 'America/Sao_Paulo', -22.8099, -43.2506, 3),
  A('SDU', 'Rio de Janeiro/Santos Dumont', 'Aeroporto Santos Dumont', 'BR', 'BR', 'America/Sao_Paulo', -22.9105, -43.1631, 2, true),
  A('BSB', 'Brasília', 'Aeroporto Internacional de Brasília', 'BR', 'BR', 'America/Sao_Paulo', -15.8697, -47.9208, 3),
  A('CNF', 'Belo Horizonte/Confins', 'Aeroporto Internacional de Confins', 'BR', 'BR', 'America/Sao_Paulo', -19.6244, -43.9719, 2),
  A('SSA', 'Salvador', 'Aeroporto Internacional de Salvador', 'BR', 'BR', 'America/Bahia', -12.9086, -38.3225, 2),
  A('REC', 'Recife', 'Aeroporto Internacional do Recife', 'BR', 'BR', 'America/Recife', -8.1265, -34.9236, 2),
  A('FOR', 'Fortaleza', 'Aeroporto Internacional de Fortaleza', 'BR', 'BR', 'America/Fortaleza', -3.7763, -38.5326, 2),
  A('NAT', 'Natal', 'Aeroporto Internacional de Natal', 'BR', 'BR', 'America/Fortaleza', -5.7681, -35.3761, 1),
  A('MCZ', 'Maceió', 'Aeroporto Internacional Zumbi dos Palmares', 'BR', 'BR', 'America/Maceio', -9.5108, -35.7917, 1),
  A('POA', 'Porto Alegre', 'Aeroporto Internacional Salgado Filho', 'BR', 'BR', 'America/Sao_Paulo', -29.9939, -51.1714, 2),
  A('CWB', 'Curitiba', 'Aeroporto Internacional Afonso Pena', 'BR', 'BR', 'America/Sao_Paulo', -25.5285, -49.1758, 2),
  A('FLN', 'Florianópolis', 'Aeroporto Internacional Hercílio Luz', 'BR', 'BR', 'America/Sao_Paulo', -27.6703, -48.5525, 2),
  A('IGU', 'Foz do Iguaçu', 'Aeroporto Internacional de Foz do Iguaçu', 'BR', 'BR', 'America/Sao_Paulo', -25.5963, -54.4872, 1),
  A('VIX', 'Vitória', 'Aeroporto de Vitória', 'BR', 'BR', 'America/Sao_Paulo', -20.2581, -40.2864, 1),
  A('GYN', 'Goiânia', 'Aeroporto Santa Genoveva', 'BR', 'BR', 'America/Sao_Paulo', -16.632, -49.2207, 1),
  A('CGB', 'Cuiabá', 'Aeroporto Internacional Marechal Rondon', 'BR', 'BR', 'America/Cuiaba', -15.6529, -56.1167, 1),
  A('MAO', 'Manaus', 'Aeroporto Internacional Eduardo Gomes', 'BR', 'BR', 'America/Manaus', -3.0386, -60.0497, 2),
  A('BEL', 'Belém', 'Aeroporto Internacional de Belém', 'BR', 'BR', 'America/Belem', -1.3792, -48.4763, 2),
  // América do Sul / Central
  A('EZE', 'Buenos Aires/Ezeiza', 'Aeropuerto Internacional Ministro Pistarini', 'AR', 'SA', 'America/Argentina/Buenos_Aires', -34.8222, -58.5358, 3),
  A('AEP', 'Buenos Aires/Aeroparque', 'Aeroparque Jorge Newbery', 'AR', 'SA', 'America/Argentina/Buenos_Aires', -34.5592, -58.4156, 2),
  A('SCL', 'Santiago', 'Aeropuerto Internacional Arturo Merino Benítez', 'CL', 'SA', 'America/Santiago', -33.393, -70.7858, 3),
  A('LIM', 'Lima', 'Aeropuerto Internacional Jorge Chávez', 'PE', 'SA', 'America/Lima', -12.0219, -77.1143, 3),
  A('BOG', 'Bogotá', 'Aeropuerto Internacional El Dorado', 'CO', 'SA', 'America/Bogota', 4.7016, -74.1469, 3),
  A('MVD', 'Montevidéu', 'Aeropuerto Internacional de Carrasco', 'UY', 'SA', 'America/Montevideo', -34.8384, -56.0308, 2),
  A('ASU', 'Assunção', 'Aeropuerto Internacional Silvio Pettirossi', 'PY', 'SA', 'America/Asuncion', -25.24, -57.5191, 2),
  A('PTY', 'Cidade do Panamá', 'Aeropuerto Internacional de Tocumen', 'PA', 'SA', 'America/Panama', 9.0714, -79.3835, 3),
  // América do Norte
  A('MIA', 'Miami', 'Miami International Airport', 'US', 'NA', 'America/New_York', 25.7959, -80.287, 3),
  A('MCO', 'Orlando', 'Orlando International Airport', 'US', 'NA', 'America/New_York', 28.4312, -81.3081, 3),
  A('FLL', 'Fort Lauderdale', 'Fort Lauderdale-Hollywood International', 'US', 'NA', 'America/New_York', 26.0742, -80.1506, 2),
  A('JFK', 'Nova York/JFK', 'John F. Kennedy International Airport', 'US', 'NA', 'America/New_York', 40.6413, -73.7781, 3),
  A('EWR', 'Nova York/Newark', 'Newark Liberty International Airport', 'US', 'NA', 'America/New_York', 40.6895, -74.1745, 3),
  A('ATL', 'Atlanta', 'Hartsfield-Jackson Atlanta International', 'US', 'NA', 'America/New_York', 33.6407, -84.4277, 3),
  A('IAH', 'Houston', 'George Bush Intercontinental Airport', 'US', 'NA', 'America/Chicago', 29.9902, -95.3368, 3),
  A('DFW', 'Dallas/Fort Worth', 'Dallas/Fort Worth International Airport', 'US', 'NA', 'America/Chicago', 32.8998, -97.0403, 3),
  A('LAX', 'Los Angeles', 'Los Angeles International Airport', 'US', 'NA', 'America/Los_Angeles', 33.9416, -118.4085, 3),
  A('CUN', 'Cancún', 'Aeropuerto Internacional de Cancún', 'MX', 'NA', 'America/Cancun', 21.0365, -86.8771, 2),
  A('MEX', 'Cidade do México', 'Aeropuerto Internacional Benito Juárez', 'MX', 'NA', 'America/Mexico_City', 19.4361, -99.0719, 3),
  // Europa
  A('MAD', 'Madrid', 'Adolfo Suárez Madrid-Barajas', 'ES', 'EU', 'Europe/Madrid', 40.4983, -3.5676, 3),
  A('BCN', 'Barcelona', 'Josep Tarradellas Barcelona-El Prat', 'ES', 'EU', 'Europe/Madrid', 41.2974, 2.0833, 3),
  A('ALC', 'Alicante', 'Aeropuerto de Alicante-Elche', 'ES', 'EU', 'Europe/Madrid', 38.2822, -0.5582, 2),
  A('AGP', 'Málaga', 'Aeropuerto de Málaga-Costa del Sol', 'ES', 'EU', 'Europe/Madrid', 36.6749, -4.4991, 2),
  A('LIS', 'Lisboa', 'Aeroporto Humberto Delgado', 'PT', 'EU', 'Europe/Lisbon', 38.7742, -9.1342, 3),
  A('OPO', 'Porto', 'Aeroporto Francisco Sá Carneiro', 'PT', 'EU', 'Europe/Lisbon', 41.2481, -8.6814, 2),
  A('CDG', 'Paris/Charles de Gaulle', 'Aéroport Paris-Charles de Gaulle', 'FR', 'EU', 'Europe/Paris', 49.0097, 2.5479, 3),
  A('AMS', 'Amsterdã', 'Amsterdam Airport Schiphol', 'NL', 'EU', 'Europe/Amsterdam', 52.3105, 4.7683, 3),
  A('FRA', 'Frankfurt', 'Frankfurt am Main Airport', 'DE', 'EU', 'Europe/Berlin', 50.0379, 8.5622, 3),
  A('LHR', 'Londres/Heathrow', 'London Heathrow Airport', 'GB', 'EU', 'Europe/London', 51.47, -0.4543, 3),
  A('FCO', 'Roma/Fiumicino', 'Aeroporto Leonardo da Vinci', 'IT', 'EU', 'Europe/Rome', 41.8003, 12.2389, 3),
  A('MXP', 'Milão/Malpensa', 'Aeroporto di Milano Malpensa', 'IT', 'EU', 'Europe/Rome', 45.6306, 8.7281, 2),
  A('ZRH', 'Zurique', 'Flughafen Zürich', 'CH', 'EU', 'Europe/Zurich', 47.4582, 8.5555, 2),
  // Oriente Médio
  A('DXB', 'Dubai', 'Dubai International Airport', 'AE', 'ME', 'Asia/Dubai', 25.2532, 55.3657, 3),
  A('DOH', 'Doha', 'Hamad International Airport', 'QA', 'ME', 'Asia/Qatar', 25.2731, 51.6081, 3),
];

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export function getAirport(code: string): Airport | undefined {
  return BY_CODE.get(code.toUpperCase());
}

export function airportLabel(code: string): string {
  const a = getAirport(code);
  return a ? `${a.code} - ${a.city}` : code;
}

export function airportCity(code: string): string {
  return getAirport(code)?.city ?? code;
}

/** Distância ortodrômica em km */
export function distanceKm(a: string | Airport, b: string | Airport): number {
  const A1 = typeof a === 'string' ? getAirport(a) : a;
  const B1 = typeof b === 'string' ? getAirport(b) : b;
  if (!A1 || !B1) return 0;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(B1.lat - A1.lat);
  const dLon = toRad(B1.lon - A1.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(A1.lat)) * Math.cos(toRad(B1.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function searchAirports(query: string, limit = 8): Airport[] {
  const q = normalize(query.trim());
  if (!q) return AIRPORTS.slice(0, limit);
  const scored = AIRPORTS.map((a) => {
    const code = a.code.toLowerCase();
    const city = normalize(a.city);
    const name = normalize(a.name);
    let score = -1;
    if (code === q) score = 100;
    else if (code.startsWith(q)) score = 80;
    else if (city.startsWith(q)) score = 60;
    else if (city.includes(q)) score = 40;
    else if (name.includes(q)) score = 20;
    else if (normalize(`${a.code} - ${a.city}`).includes(q)) score = 10;
    return { a, score: score + (score >= 0 ? a.size : 0) };
  }).filter((x) => x.score >= 0);
  return scored.sort((x, y) => y.score - x.score).slice(0, limit).map((x) => x.a);
}
