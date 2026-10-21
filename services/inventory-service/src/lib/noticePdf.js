import fs from 'fs';
import os from 'os';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { prisma } from '../db.js';
import {
  ASSOCIATION_BRAND,
  drawAssociationLetterhead,
  drawPresidentSignature,
  loadLetterheadBoard,
} from './associationBrand.js';
import {
  ensureDiskRoot,
  saveUploadBuffer,
  uploadRoot,
  useObjectStorage,
} from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const noticesUploadDir = path.resolve(uploadRoot, 'notices');

/**
 * Generate an official circular PDF for a published notice.
 */
export async function generateNoticePdf({
  noticeId,
  associationId,
  associationName = ASSOCIATION_BRAND.fullName,
  title,
  body,
  publishedAt,
  publishedByName,
  category,
}) {
  const fileName = `notice-${noticeId}-${Date.now()}.pdf`;
  const publicPath = `/uploads/notices/${fileName}`;

  const letterhead = await loadLetterheadBoard(
    prisma,
    associationId || process.env.ASSOCIATION_ID
  );
  void associationName;

  const buffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: 'A4',
      bufferPages: true,
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const layout = drawAssociationLetterhead(doc, {
      docTitle: 'NOTICE TO RESIDENTS',
      boardMembers: letterhead.members,
      president: letterhead.president,
    });

    let y = layout.bodyStartY;
    if (category) {
      doc
        .font('Times-Italic')
        .fontSize(10)
        .fillColor('#555')
        .text(category, layout.contentLeft, y, {
          width: layout.contentWidth,
          align: 'center',
        });
      y = doc.y + 8;
    }

    doc
      .font('Times-Bold')
      .fontSize(13)
      .fillColor('#000')
      .text(title, layout.contentLeft, y, { width: layout.contentWidth });
    y = doc.y + 10;

    doc
      .font('Times-Roman')
      .fontSize(10.5)
      .fillColor('#111')
      .text(body || '', layout.contentLeft, y, {
        width: layout.contentWidth,
        align: 'left',
        lineGap: 3,
      });

    const dateStr = publishedAt
      ? new Date(publishedAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';
    if (dateStr) {
      doc.moveDown(0.8);
      doc
        .font('Times-Roman')
        .fontSize(10)
        .text(`Date: ${dateStr}`, layout.contentLeft, doc.y, {
          width: layout.contentWidth,
        });
    }

    doc.moveDown(0.6);
    doc
      .font('Times-Roman')
      .fontSize(10)
      .text(
        `Issued for record by: ${publishedByName || 'Secretary'}`,
        layout.contentLeft,
        doc.y,
        { width: layout.contentWidth }
      );

    drawPresidentSignature(doc, {
      x: layout.contentLeft,
      width: layout.contentWidth,
      president: letterhead.president,
    });

    doc.end();
  });

  if (useObjectStorage()) {
    const saved = await saveUploadBuffer(
      'notices',
      buffer,
      fileName,
      'application/pdf',
    );
    return {
      fileName: saved.filename,
      absolutePath: null,
      publicPath: saved.url,
    };
  }

  ensureDiskRoot();
  fs.mkdirSync(noticesUploadDir, { recursive: true });
  const absolutePath = path.join(noticesUploadDir, fileName);
  fs.writeFileSync(absolutePath, buffer);
  return { fileName, absolutePath, publicPath };
}

/** Resolve a notice PDF for download (disk path or object key). */
export function noticePdfDiskPath(fileName) {
  return path.join(noticesUploadDir, fileName);
}

export function noticePdfTempFallback(fileName) {
  return path.join(os.tmpdir(), fileName);
}
