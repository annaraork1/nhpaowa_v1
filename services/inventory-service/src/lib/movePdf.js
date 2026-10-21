import PDFDocument from 'pdfkit';
import { prisma } from '../db.js';
import {
  ASSOCIATION_BRAND,
  drawAssociationLetterhead,
  drawPresidentSignature,
  loadLetterheadBoard,
} from './associationBrand.js';

const PDF_STATUSES = new Set(['APPROVED', 'IN_PROGRESS', 'COMPLETED']);

export function canDownloadMovePdf(status) {
  return PDF_STATUSES.has(status);
}

function flatLabel(flat) {
  if (!flat) return '—';
  const tower = flat.tower != null ? `Tower ${flat.tower}` : '';
  const num = flat.flatNumber != null ? `Flat ${flat.flatNumber}` : '';
  return [tower, num].filter(Boolean).join(' · ') || '—';
}

function typeTitle(type) {
  if (type === 'MOVE_OUT') return 'MOVE-OUT AUTHORIZATION';
  if (type === 'INTERNAL_SHIFT') return 'INTERNAL SHIFT AUTHORIZATION';
  return 'MOVE-IN AUTHORIZATION';
}

function typeLabel(type) {
  if (type === 'MOVE_OUT') return 'Move out';
  if (type === 'INTERNAL_SHIFT') return 'Internal shift';
  return 'Move in';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Stream an official move gate-pass / authorization PDF to `res`.
 */
export async function streamMovePdf(res, move) {
  const letterhead = await loadLetterheadBoard(
    prisma,
    move.associationId || process.env.ASSOCIATION_ID
  );

  const fileName = `move-${move.type.toLowerCase()}-${(move.id || '').slice(0, 8)}.pdf`;
  const doc = new PDFDocument({
    margin: 48,
    size: 'A4',
    bufferPages: true,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  doc.pipe(res);

  const layout = drawAssociationLetterhead(doc, {
    docTitle: typeTitle(move.type),
    boardMembers: letterhead.members,
    president: letterhead.president,
  });

  let y = layout.bodyStartY;
  const left = layout.contentLeft;
  const width = layout.contentWidth;

  doc
    .font('Times-Roman')
    .fontSize(10)
    .fillColor('#333')
    .text(
      'This document authorizes the move described below for gate / Security and resident records.',
      left,
      y,
      { width, align: 'left' }
    );
  y = doc.y + 12;

  const rows = [
    ['Reference', move.id],
    ['Status', move.status],
    ['Type', typeLabel(move.type)],
    [
      move.type === 'INTERNAL_SHIFT' ? 'Origin flat' : 'Flat',
      flatLabel(move.flat),
    ],
  ];
  if (move.type === 'INTERNAL_SHIFT') {
    rows.push(['Destination flat', flatLabel(move.destinationFlat)]);
  }
  rows.push(
    ['Party', move.partyType === 'TENANT' ? 'Tenant' : 'Owner'],
    ['Scheduled date', formatDate(move.scheduledDate)],
    ['Contact name', move.contactName || '—'],
    ['Contact phone', move.contactPhone || '—']
  );
  if (move.moverNotes) {
    rows.push(['Mover / vehicle notes', move.moverNotes]);
  }

  const labelW = 130;
  for (const [label, value] of rows) {
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#5b2d8e')
      .text(`${label}:`, left, y, { width: labelW, continued: false });
    doc
      .font('Times-Roman')
      .fontSize(10)
      .fillColor('#111')
      .text(String(value ?? '—'), left + labelW, y, {
        width: width - labelW,
      });
    y = Math.max(doc.y, y) + 6;
  }

  y += 8;
  doc
    .font('Times-Italic')
    .fontSize(9.5)
    .fillColor('#222')
    .text(
      'Security: Please verify contact identity at the gate, allow access for the scheduled date, and retain this pass for the shift log. Residents may keep a copy for their records.',
      left,
      y,
      { width, align: 'left', lineGap: 2 }
    );

  doc.moveDown(0.8);
  doc
    .font('Times-Roman')
    .fontSize(9)
    .fillColor('#444')
    .text(
      `Issued under authority of ${ASSOCIATION_BRAND.shortName} · ${formatDate(new Date())}`,
      left,
      doc.y,
      { width }
    );

  drawPresidentSignature(doc, {
    x: left,
    width,
    president: letterhead.president,
  });

  doc.end();
}
