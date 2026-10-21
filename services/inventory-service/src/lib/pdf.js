import PDFDocument from 'pdfkit';
import { prisma } from '../db.js';
import {
  drawAssociationLetterhead,
  drawPresidentSignature,
  loadLetterheadBoard,
} from './associationBrand.js';

export async function sendPdfTable(res, { title, columns, rows, filename, associationId }) {
  const letterhead = await loadLetterheadBoard(
    prisma,
    associationId || process.env.ASSOCIATION_ID
  );

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename || 'report.pdf'}"`
  );
  doc.pipe(res);

  const layout = drawAssociationLetterhead(doc, {
    docTitle: title,
    boardMembers: letterhead.members,
    president: letterhead.president,
  });
  doc
    .fontSize(9)
    .fillColor('#666')
    .text(
      `Generated ${new Date().toLocaleString('en-IN')}`,
      layout.contentLeft,
      layout.bodyStartY,
      { width: layout.contentWidth }
    );
  doc.moveDown();
  doc.fillColor('#000');

  const colWidth = layout.contentWidth / columns.length;
  let y = doc.y;
  doc.fontSize(9).font('Helvetica-Bold');
  columns.forEach((c, i) => {
    doc.text(c.label, layout.contentLeft + i * colWidth, y, {
      width: colWidth - 4,
      continued: false,
    });
  });
  y += 16;
  doc
    .moveTo(layout.contentLeft, y)
    .lineTo(layout.pageRight, y)
    .stroke('#ccc');
  y += 8;
  doc.font('Helvetica');

  for (const row of rows) {
    if (y > doc.page.height - 120) {
      doc.addPage();
      const next = drawAssociationLetterhead(doc, {
        docTitle: title,
        boardMembers: letterhead.members,
        president: letterhead.president,
      });
      y = next.bodyStartY;
    }
    columns.forEach((c, i) => {
      const val = c.value(row);
      doc.text(val == null ? '' : String(val), layout.contentLeft + i * colWidth, y, {
        width: colWidth - 4,
      });
    });
    y += 14;
  }

  doc.y = y;
  drawPresidentSignature(doc, {
    x: layout.contentLeft,
    width: layout.contentWidth,
    president: letterhead.president,
  });
  doc.end();
}
