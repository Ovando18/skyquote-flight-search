'use client';

/**
 * Orçamento para o cliente final — modelo padrão "Renda & Rotas".
 * Documento voltado ao cliente: mostra apenas o valor final (custo + lucro), sem expor
 * custo, margem, fonte ou milhas.
 */
import type { ClientInfo, FlightOffer, Slice } from './types';
import { CABIN_LABELS } from './types';
import { airportCity } from './airports';
import { airlineName } from './airlines';
import { baggageText, brDate, dayOffset, duration, money, passengersLabel, shortDate, stopsLabel, time } from './format';
import { deriveTrip, sortForTrip } from './trip';

type RGB = [number, number, number];
const NAVY: RGB = [22, 33, 74];
const GOLD: RGB = [196, 154, 62];
const GOLD_LIGHT: RGB = [250, 243, 226];
const INK: RGB = [30, 36, 52];
const MUTED: RGB = [110, 116, 132];
const LINE: RGB = [226, 222, 212];
const CREAM: RGB = [252, 250, 246];

import { COMPANY_NAME, LOGO_URL } from './brand';
export { COMPANY_NAME, LOGO_URL };

export interface BudgetInput {
  client: ClientInfo;
  offers: FlightOffer[];
  baseCost: number;
  markup: number;
  markupMode: 'total' | 'per_pax';
  validityDays: number;
  notes?: string;
}

export function budgetTotals(i: Pick<BudgetInput, 'baseCost' | 'markup' | 'markupMode'>, pax: number) {
  const profit = i.markupMode === 'per_pax' ? i.markup * pax : i.markup;
  const total = Math.round((i.baseCost + profit) * 100) / 100;
  return { profit, total, perPax: Math.round((total / Math.max(pax, 1)) * 100) / 100, margin: total > 0 ? profit / total : 0 };
}

const safe = (s: string) =>
  s
    .replace(/[→⇄]/g, '>')
    .replace(/[–—]/g, '-')
    .replace(/[^\x00-\xFF]/g, '');

const pad = (n: number) => String(n).padStart(2, '0');

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function slug(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

export async function generateBudgetPdf(input: BudgetInput): Promise<string> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const logo = await loadImage(LOGO_URL);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const trip = deriveTrip(input.offers);
  const pax = trip.adults + trip.children;
  const { total, perPax } = budgetTotals(input, pax);
  const now = new Date();
  const valid = new Date(now.getTime() + Math.max(1, input.validityDays) * 86400000);
  const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const number = `ORC-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${now.getTime().toString(36).toUpperCase().slice(-4)}`;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ------------------------------------------------------------ Cabeçalho
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, W, 50, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, W, 2.2, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(M, 50, W - M, 50);

  if (logo) doc.addImage(logo, 'PNG', M, 7, 38, 37.4);
  const tx = logo ? M + 45 : M;
  doc.setFont('times', 'bold');
  doc.setFontSize(23);
  doc.setTextColor(...NAVY);
  doc.text(safe('Orçamento de Viagem'), tx, 22);
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text(COMPANY_NAME, tx, 29);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(safe(`${trip.origin} (${airportCity(trip.origin)})  >  ${trip.destination} (${airportCity(trip.destination)})`), tx, 37);

  // Caixa nº / datas
  const bx = W - M - 52;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...LINE);
  doc.roundedRect(bx, 11, 52, 30, 2, 2, 'FD');
  const meta: [string, string][] = [
    ['Nº DO ORÇAMENTO', number],
    ['EMITIDO EM', fmt(now)],
    ['VÁLIDO ATÉ', fmt(valid)],
  ];
  meta.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...MUTED);
    doc.text(safe(k), bx + 4, 17 + i * 8.6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(...NAVY);
    doc.text(safe(v), bx + 4, 20.8 + i * 8.6);
  });

  let y = 60;

  // ------------------------------------------------------------ Cliente + resumo
  const colW = (W - 2 * M - 6) / 2;
  const boxH = 38;
  const drawBox = (x: number, title: string, rows: [string, string][]) => {
    doc.setDrawColor(...LINE);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, colW, boxH, 2, 2, 'FD');
    doc.setFillColor(...GOLD);
    doc.rect(x, y + 4, 1.4, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text(safe(title), x + 5, y + 9);
    rows.forEach(([k, v], i) => {
      const ry = y + 16 + i * 5.6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(...MUTED);
      doc.text(safe(k), x + 5, ry);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...INK);
      doc.text(doc.splitTextToSize(safe(v), colW - 34)[0] ?? '', x + 28, ry);
    });
  };
  const clientRows: [string, string][] = [['Cliente', input.client.name.trim() || 'A/C do cliente']];
  if (input.client.phone.trim()) clientRows.push(['WhatsApp', input.client.phone.trim()]);
  if (input.client.email.trim()) clientRows.push(['E-mail', input.client.email.trim()]);
  drawBox(M, 'PREPARADO PARA', clientRows);
  const tripRows: [string, string][] = [
    ['Ida', `${brDate(trip.departDate)}`],
    ...(trip.returnDate ? ([['Volta', brDate(trip.returnDate)]] as [string, string][]) : []),
    ['Passageiros', passengersLabel(trip.adults, trip.children)],
    ['Classe', CABIN_LABELS[trip.cabin]],
  ];
  drawBox(M + colW + 6, 'RESUMO DA VIAGEM', tripRows);
  y += boxH + 10;

  // ------------------------------------------------------------ Itinerário
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(safe('Itinerário'), M, y);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(M, y + 2, M + 22, y + 2);
  y += 7;

  const slices: { slice: Slice; offer: FlightOffer }[] = sortForTrip(input.offers).flatMap((o) =>
    o.slices.map((slice) => ({ slice, offer: o })),
  );

  slices.forEach(({ slice }, si) => {
    const f = slice.segments[0];
    const l = slice.segments[slice.segments.length - 1];
    const isOut = si === 0 || f.from === trip.origin;
    if (y > H - 60) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(...NAVY);
    doc.roundedRect(M, y, W - 2 * M, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(...GOLD);
    doc.text(isOut ? 'IDA' : 'VOLTA', M + 4, y + 5.9);
    doc.setTextColor(255, 255, 255);
    doc.text(
      safe(`${shortDate(f.departure)}   ·   ${f.from} > ${l.to}   ·   ${duration(slice.durationMin)}   ·   ${stopsLabel(slice)}`),
      M + 19,
      y + 5.9,
    );
    y += 10.5;

    const body: (string | { content: string; colSpan: number; styles: Record<string, unknown> })[][] = [];
    slice.segments.forEach((g, i) => {
      const plus = dayOffset(g.departure, g.arrival);
      body.push(
        [
          `${airlineName(g.carrier)}\nVoo ${g.flightNumber}`,
          `${time(g.departure)}  ${g.from}\n${airportCity(g.from)} · ${brDate(g.departure)}`,
          `${time(g.arrival)}${plus > 0 ? ` (+${plus})` : ''}  ${g.to}\n${airportCity(g.to)} · ${brDate(g.arrival)}`,
          g.durationMin ? duration(g.durationMin) : '-',
        ].map(safe),
      );
      const lay = slice.layovers[i];
      if (lay) {
        body.push([
          {
            content: safe(
              `Conexão em ${airportCity(lay.airport)} (${lay.airport})  ·  tempo de espera ${duration(lay.durationMin)}${
                lay.overnight ? '  ·  pernoite' : ''
              }`,
            ),
            colSpan: 4,
            styles: { fillColor: GOLD_LIGHT, textColor: [140, 100, 20], fontStyle: 'italic', fontSize: 7.4, halign: 'center' },
          },
        ]);
      }
    });
    autoTable(doc, {
      startY: y,
      head: [['Companhia / Voo', 'Partida', 'Chegada', 'Duração'].map(safe)],
      body,
      margin: { left: M, right: M },
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, textColor: INK, valign: 'middle' },
      headStyles: { textColor: MUTED, fontStyle: 'bold', fontSize: 6.8, fillColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 46, fontStyle: 'bold' }, 3: { cellWidth: 20, halign: 'center' } },
      didDrawCell: (d) => {
        if (d.section === 'body') {
          doc.setDrawColor(...LINE);
          doc.setLineWidth(0.2);
          doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
        }
      },
    });
    y = lastY() + 6;
  });

  // ------------------------------------------------------------ Incluso
  const included = Array.from(
    new Set(input.offers.map((o) => `${CABIN_LABELS[o.cabin]}  ·  Bagagem: ${baggageText(o.baggage)}`)),
  );
  if (y > H - 85) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(safe('O que está incluído'), M, y);
  doc.setDrawColor(...GOLD);
  doc.line(M, y + 2, M + 22, y + 2);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.4);
  doc.setTextColor(...INK);
  const bullets = [...included, 'Taxas de embarque incluídas no valor total'];
  for (const b of bullets) {
    const lines = doc.splitTextToSize(safe(b), W - 2 * M - 8);
    doc.setFillColor(...GOLD);
    doc.circle(M + 1.5, y - 1.1, 0.9, 'F');
    doc.text(lines, M + 5, y);
    y += lines.length * 4.2 + 1.2;
  }
  y += 4;

  // ------------------------------------------------------------ Valor
  if (y > H - 70) {
    doc.addPage();
    y = 20;
  }
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, y, W - 2 * M, 30, 3, 3, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(M, y + 6, 2, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text('INVESTIMENTO TOTAL', M + 8, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(210, 216, 235);
  doc.text(safe(`${passengersLabel(trip.adults, trip.children)}  ·  taxas incluídas`), M + 8, y + 16);
  doc.text(safe(`Equivale a ${money(perPax)} por passageiro`), M + 8, y + 21.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(safe(money(total)), W - M - 7, y + 19, { align: 'right' });
  y += 38;

  // ------------------------------------------------------------ Observações e condições
  const notes = input.notes?.trim();
  if (notes) {
    if (y > H - 50) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(...NAVY);
    doc.text(safe('Observações'), M, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(safe(notes), W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 4 + 5;
  }

  const conditions = [
    `Orçamento válido até ${fmt(valid)}. Valores e disponibilidade de assentos estão sujeitos a alteração até a confirmação da reserva e emissão dos bilhetes.`,
    'Horários informados no fuso local de cada aeroporto. A documentação de viagem (documento de identidade, passaporte, vistos e vacinas) é de responsabilidade do passageiro.',
  ];
  if (y > H - 40) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.setTextColor(...NAVY);
  doc.text(safe('Condições'), M, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...MUTED);
  for (const c of conditions) {
    const lines = doc.splitTextToSize(safe(c), W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 3.7 + 1.5;
  }

  // ------------------------------------------------------------ Rodapé
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(COMPANY_NAME, M, H - 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(safe(`${number}  ·  Página ${p} de ${pages}`), W - M, H - 9, { align: 'right' });
    doc.setFillColor(...GOLD);
    doc.rect(0, H - 2.2, W, 2.2, 'F');
  }

  const who = slug(input.client.name) || 'Cliente';
  const filename = `Orcamento_${who}_${trip.origin}-${trip.destination}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.pdf`;
  doc.save(filename);
  return filename;
}
