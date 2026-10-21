import PDFDocument from 'pdfkit';

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export async function buildRegistryPdf({ schools, buses }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const done = streamToBuffer(doc);
  doc.fontSize(16).text('NHPAOWA — School & Bus Registry', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#555').text(`Generated ${new Date().toISOString()}`);
  doc.fillColor('#000').moveDown();

  doc.fontSize(12).text('Schools', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(9);
  for (const s of schools) {
    doc.text(
      `${s.name} — ${s.primaryContactName} / ${s.primaryContactPhone}${
        s.address ? ` — ${s.address}` : ''
      }`
    );
  }
  doc.moveDown();
  doc.fontSize(12).text('Buses', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(9);
  for (const b of buses) {
    doc.text(
      `${b.vehicleRegistrationNumber} | ${b.school?.name || ''} | Driver: ${b.driverName} (${b.driverPhone})`
    );
  }
  doc.end();
  return done;
}

export async function buildDailyTripsPdf({ date, rows }) {
  const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
  const done = streamToBuffer(doc);
  doc.fontSize(14).text(`NHPAOWA — Bus trips & child counts (${date})`, {
    underline: true,
  });
  doc.moveDown(0.5);
  doc.fontSize(8);
  const header = 'Vehicle | School | Dir | IN | OUT | Children | Status';
  doc.text(header);
  doc.moveDown(0.2);
  for (const r of rows) {
    doc.text(
      [
        r.vehicle,
        r.schoolName,
        r.direction,
        r.gateInAt || '—',
        r.gateOutAt || '—',
        r.childCount ?? '—',
        r.status,
      ].join(' | ')
    );
  }
  doc.end();
  return done;
}
