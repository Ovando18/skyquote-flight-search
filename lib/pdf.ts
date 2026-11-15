'use client';

import type { FlightOffer, SearchParams, Slice } from './types';
import { CABIN_LABELS, CABIN_SHORT, PROVIDER_LABELS } from './types';
import { airportCity } from './airports';
import { airlineName } from './airlines';
import { baggageText, brDate, dayOffset, duration, money, passengersLabel, points, stopsLabel, time } from './format';

type RGB = [number, number, number];
const NAVY: RGB = [10, 25, 47];
const NAVY2: RGB = [17, 34, 64];
const SKY: RGB = [0, 150, 199];
const SKY_LIGHT: RGB = [224, 244, 252];
const AMBER: RGB = [245, 158, 11];
const AMBER_LIGHT: RGB = [254, 243, 219];
const GREEN: RGB = [16, 185, 129];
const INK: RGB = [22, 32, 51];
const MUTED: RGB = [100, 112, 135];
const LINE: RGB = [214, 222, 235];
const ZEBRA: RGB = [246, 248, 252];

/** Remove caracteres fora do WinAnsi (fontes padrão do PDF) */
const safe = (s: string) =>
  s
    .replace(/[→⇄]/g, '>')
    .replace(/[–—]/g, '-')
    .replace(/≈/g, '~')
    .replace(/[^\x00-\xFF]/g, '');

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function sliceSummary(s: Slice) {
  const f = s.segments[0];
  const l = s.segments[s.segments.length - 1];
  const plus = dayOffset(f.departure, l.arrival);
  return `${brDate(f.departure)}\n${time(f.departure)} ${f.from} > ${time(l.arrival)}${plus > 0 ? ` (+${plus})` : ''} ${l.to}`;
}

export async function generateQuotePdf(offers: FlightOffer[], params: SearchParams): Promise<string> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const now = new Date();
  const issued = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} às ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const isoToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const ref = `SQ-${params.origin}${params.destination}-${now.getTime().toString(36).toUpperCase().slice(-6)}`;
  const roundtrip = params.tripType === 'roundtrip' && !!params.returnDate;
  const sorted = [...offers].sort((a, b) => a.sortPrice - b.sortPrice);
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ---------------------------------------------------------------- Cabeçalho
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 38, 'F');
  doc.setFillColor(...SKY);
  doc.rect(0, 38, W, 1.2, 'F');
  // "rota" decorativa
  doc.setDrawColor(56, 189, 248);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.setLineWidth(0.3);
  doc.line(W - 92, 30, W - M, 30);
  doc.setLineDashPattern([], 0);
  doc.setFillColor(56, 189, 248);
  doc.circle(W - 92, 30, 0.9, 'F');
  doc.circle(W - M, 30, 0.9, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(safe('COTAÇÃO DE PASSAGENS AÉREAS'), M, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 200, 235);
  doc.text('SkyQuote  ·  Flight Search & Quotation', M, 23.5);
  doc.setTextColor(200, 214, 235);
  doc.text(safe(`Emitida em ${issued}`), M, 29);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text(safe(`Ref. ${ref}`), M, 33.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(params.origin, W - 92, 24);
  doc.text(params.destination, W - M, 24, { align: 'right' });
  doc.setFontSize(12);
  doc.setTextColor(56, 189, 248);
  doc.text(roundtrip ? '<>' : '>', (W - 92 + W - M) / 2 + 4, 23, { align: 'center' });

  // ---------------------------------------------------------------- Resumo da busca
  let y = 46;
  doc.setFillColor(...ZEBRA);
  doc.setDrawColor(...LINE);
  doc.roundedRect(M, y, W - 2 * M, 30, 2, 2, 'FD');
  const col = (W - 2 * M) / 3;
  const summary: [string, string][] = [
    ['TRECHO', `${params.origin} (${airportCity(params.origin)}) > ${params.destination} (${airportCity(params.destination)})`],
    ['TIPO DE VIAGEM', roundtrip ? 'Ida e Volta' : 'Somente Ida'],
    ['DATAS', roundtrip ? `Ida ${brDate(params.departDate)}  ·  Volta ${brDate(params.returnDate!)}` : `Ida ${brDate(params.departDate)}`],
    ['PASSAGEIROS', passengersLabel(params.adults, params.children)],
    ['CLASSE', CABIN_LABELS[params.cabin]],
    ['OPÇÕES COTADAS', `${sorted.length} (do menor para o maior valor)`],
  ];
  summary.forEach(([k, v], i) => {
    const cx = M + 5 + (i % 3) * col;
    const cy = y + 8 + Math.floor(i / 3) * 13;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(safe(k), cx, cy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(safe(v), col - 8);
    doc.text(lines.slice(0, 2), cx, cy + 4.6);
  });
  y += 38;

  // ---------------------------------------------------------------- Quadro comparativo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('QUADRO COMPARATIVO', M, y);
  y += 2.5;

  const head = ['#', 'Companhia / Fonte', 'Ida', ...(roundtrip ? ['Volta'] : []), 'Paradas', 'Duração', 'Tarifa', 'Valor Total'];
  const body = sorted.map((o, i) => {
    const priceCell = o.isAward && o.miles
      ? `${points(o.miles.pointsTotal)} milhas\n+ ${money(o.miles.taxesTotal, o.miles.taxesCurrency)}`
      : money(o.totalPrice, o.currency);
    return [
      String(i + 1),
      `${o.airlineName}\n${o.isAward ? `Seats.aero · ${o.miles?.program ?? ''}` : PROVIDER_LABELS[o.provider]}`,
      sliceSummary(o.slices[0]),
      ...(roundtrip ? [o.slices[1] ? sliceSummary(o.slices[1]) : '-'] : []),
      o.slices.map((s) => (s.segments.length === 1 ? 'Direto' : `${s.segments.length - 1} conex.`)).join('\n'),
      o.slices.map((s) => duration(s.durationMin)).join('\n'),
      `${CABIN_SHORT[o.cabin]}\n${o.isAward ? 'Resgate' : o.fareBrand}`,
      priceCell,
    ].map(safe);
  });

  autoTable(doc, {
    startY: y,
    head: [head.map(safe)],
    body,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7.4, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0.2, valign: 'middle' },
    headStyles: { fillColor: NAVY2, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' },
      [head.length - 1]: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 0 && data.column.index === head.length - 1) {
        data.cell.styles.textColor = [180, 100, 0];
      }
    },
  });
  y = lastY() + 9;

  // ---------------------------------------------------------------- Detalhamento
  const ensure = (need: number) => {
    if (y + need > H - 22) {
      doc.addPage();
      y = 18;
    }
  };

  ensure(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(safe('DETALHAMENTO DAS OPÇÕES'), M, y);
  y += 4;

  sorted.forEach((o, idx) => {
    ensure(42);
    // barra título
    doc.setFillColor(...(idx === 0 ? AMBER_LIGHT : SKY_LIGHT));
    doc.roundedRect(M, y, W - 2 * M, 11, 1.5, 1.5, 'F');
    doc.setFillColor(...(idx === 0 ? AMBER : SKY));
    doc.rect(M, y, 1.6, 11, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const title = `OPÇÃO ${idx + 1}  ·  ${o.airlineName}${o.isAward ? '  ·  Seats.aero' : ''}`;
    doc.text(safe(title), M + 4.5, y + 4.7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...MUTED);
    const sub = `${CABIN_LABELS[o.cabin]}  ·  ${o.fareBrand}${o.bookingClass ? `  ·  classe ${o.bookingClass}` : ''}${
      idx === 0 ? '  ·  MELHOR PREÇO' : ''
    }`;
    doc.text(safe(sub), M + 4.5, y + 8.8);
    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    const priceTitle = o.isAward && o.miles ? `${points(o.miles.pointsTotal)} mi + ${money(o.miles.taxesTotal, o.miles.taxesCurrency)}` : money(o.totalPrice, o.currency);
    doc.text(safe(priceTitle), W - M - 3, y + 6.8, { align: 'right' });
    y += 13;

    const rows: (string | { content: string; colSpan: number; styles: Record<string, unknown> })[][] = [];
    o.slices.forEach((s) => {
      const label = s.direction === 'outbound' ? 'IDA' : 'VOLTA';
      s.segments.forEach((g, i) => {
        const plus = dayOffset(g.departure, g.arrival);
        rows.push(
          [
            i === 0 ? `${label}\n${duration(s.durationMin)}` : '',
            `${g.flightNumber}\n${airlineName(g.carrier)}${g.operatingCarrier ? ` (op. ${g.operatingCarrier})` : ''}`,
            `${brDate(g.departure)} ${time(g.departure)}\n${g.from} - ${airportCity(g.from)}`,
            `${brDate(g.arrival)} ${time(g.arrival)}${plus > 0 ? ` (+${plus})` : ''}\n${g.to} - ${airportCity(g.to)}`,
            g.durationMin ? duration(g.durationMin) : '-',
            g.aircraft ?? '-',
          ].map(safe),
        );
        const lay = s.layovers[i];
        if (lay) {
          const next = s.segments[i + 1];
          rows.push([
            '',
            {
              content: safe(
                `Conexão em ${lay.airport} (${airportCity(lay.airport)})  ·  tempo de solo/espera: ${duration(lay.durationMin)}${
                  next ? `  ·  voo seguinte: ${next.flightNumber}` : ''
                }${lay.overnight ? '  ·  pernoite' : ''}`,
              ),
              colSpan: 5,
              styles: { fillColor: AMBER_LIGHT, textColor: [146, 84, 0], fontStyle: 'bold', fontSize: 6.9 },
            },
          ]);
        }
      });
    });

    autoTable(doc, {
      startY: y,
      head: [['Trecho', 'Voo', 'Partida', 'Chegada', 'Duração', 'Aeronave'].map(safe)],
      body: rows,
      margin: { left: M, right: M },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7.3, cellPadding: 1.6, textColor: INK, lineColor: LINE, lineWidth: 0.2, valign: 'middle' },
      headStyles: { fillColor: [235, 240, 248], textColor: NAVY, fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 17, fontStyle: 'bold', textColor: SKY },
        1: { cellWidth: 32 },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 22 },
      },
    });
    y = lastY() + 4;

    // Totais e bagagem
    const lines: string[] = [];
    lines.push(`Duração total: ${o.slices.map((s) => `${s.direction === 'outbound' ? 'ida' : 'volta'} ${duration(s.durationMin)} (${stopsLabel(s).toLowerCase()})`).join('  ·  ')}`);
    lines.push(`Bagagem: ${baggageText(o.baggage)}`);
    if (o.isAward && o.miles) {
      lines.push(
        `Programa: ${o.miles.program}  ·  ${points(o.miles.pointsPerPassenger)} milhas + ${money(o.miles.taxesPerPassenger, o.miles.taxesCurrency)} por passageiro  ·  Valor equivalente estimado: ${money(o.miles.equivalentBRL)}`,
      );
    } else {
      lines.push(
        `Valor por adulto: ${money(o.pricePerAdult, o.currency)}${
          o.pricePerChild !== undefined && params.children ? `  ·  por criança: ${money(o.pricePerChild, o.currency)}` : ''
        }  ·  Valor total (${passengersLabel(params.adults, params.children)}): ${money(o.totalPrice, o.currency)}`,
      );
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...MUTED);
    for (const l of lines) {
      const wrapped = doc.splitTextToSize(safe(l), W - 2 * M);
      ensure(wrapped.length * 3.6 + 2);
      doc.text(wrapped, M, y + 2.5);
      y += wrapped.length * 3.6;
    }
    y += 7;
  });

  // ---------------------------------------------------------------- Rodapé (todas as páginas)
  const disclaimer =
    'Valores e disponibilidade de assentos estão sujeitos a alteração sem aviso prévio até o momento da emissão dos bilhetes. ' +
    'Tarifas incluem taxas de embarque estimadas; resgates em milhas dependem da disponibilidade do programa de fidelidade e de suas regras. ' +
    (sorted.some((o) => o.simulated) ? 'Algumas opções foram geradas em modo de simulação.' : '');
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(M, H - 16, W - M, H - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(safe(disclaimer), W - 2 * M - 26), M, H - 12.5);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...SKY);
    doc.text(safe(`Página ${p}/${pages}`), W - M, H - 12.5, { align: 'right' });
    doc.setFillColor(...GREEN);
    doc.circle(W - M - 1, H - 8.6, 0.7, 'F');
  }

  const filename = `Cotacao_Voos_${params.origin}-${params.destination}_${isoToday}.pdf`;
  doc.save(filename);
  return filename;
}
