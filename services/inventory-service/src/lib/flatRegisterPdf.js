import PDFDocument from 'pdfkit';
import {
  formatCampusFlatId,
  flatMemberRoleLabel,
} from '@nhpaowa/shared-ui';
import { prisma } from '../db.js';
import {
  ASSOCIATION_BRAND,
  loadLetterheadBoard,
  resolveBrandImage,
} from './associationBrand.js';

const OCC = {
  OWNER_OCCUPIED: 'Owner occ.',
  TENANT_OCCUPIED: 'Tenant occ.',
  VACANT: 'Vacant',
};

const VEHICLE = {
  FOUR_WHEELER: '4W',
  TWO_WHEELER: '2W',
  EV: 'EV',
  OTHER: 'Other',
};

/** Slot letter preferred; flat letter is fallback. */
export function parkingLetterInfo(slot, flat) {
  if (slot?.letterFileUrl) {
    return {
      status: 'On file',
      scope: 'slot',
      url: slot.letterFileUrl,
      name: slot.letterOriginalName || null,
    };
  }
  if (flat?.parkingLetterUrl) {
    return {
      status: 'On file (flat)',
      scope: 'flat',
      url: flat.parkingLetterUrl,
      name: flat.parkingLetterOriginalName || null,
    };
  }
  return { status: 'Missing', scope: null, url: null, name: null };
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function floorLabel(floor) {
  if (floor === 0 || floor === '0') return 'G';
  if (floor == null || floor === '') return '—';
  return String(floor);
}

function membersCell(members) {
  if (!members?.length) return '—';
  return members
    .map(
      (m) =>
        `${m.name} (${flatMemberRoleLabel(m.role)})` +
        (m.phone ? ` ${m.phone}` : '')
    )
    .join('\n');
}

function parkingCell(flat) {
  const slots = flat.parkingAllotments || [];
  if (!slots.length) {
    return flat.parkingLetterUrl
      ? `— none —\nLetter: On file (flat)`
      : '— none —';
  }
  return slots
    .map((s) => {
      const letter = parkingLetterInfo(s, flat);
      return `${s.label} (${s.slotType}) · Letter: ${letter.status}`;
    })
    .join('\n');
}

function vehiclesCell(vehicles) {
  if (!vehicles?.length) return '—';
  return vehicles
    .map((v) => {
      const type = VEHICLE[v.vehicleType] || v.vehicleType || '';
      const bits = [
        v.registrationNo,
        type,
        [v.make, v.model].filter(Boolean).join(' '),
        v.approvalStatus && v.approvalStatus !== 'APPROVED'
          ? `[${v.approvalStatus}]`
          : null,
      ].filter(Boolean);
      return bits.join(' ');
    })
    .join('\n');
}

function petsCell(pets) {
  if (!pets?.length) return '—';
  return pets
    .map((p) => {
      const bits = [
        p.name,
        p.species,
        p.breed,
        p.approvalStatus && p.approvalStatus !== 'APPROVED'
          ? `[${p.approvalStatus}]`
          : null,
      ].filter(Boolean);
      return bits.join(' ');
    })
    .join('\n');
}

function contactsCell(contacts) {
  if (!contacts?.length) return '—';
  return contacts
    .map((c) =>
      [c.name, c.phone, c.relationship, c.isPrimary ? 'primary' : null]
        .filter(Boolean)
        .join(' ')
    )
    .join('\n');
}

function devicesCell(devices) {
  if (!devices?.length) return '—';
  return devices
    .map((d) =>
      [d.deviceType, d.identifier, d.status].filter(Boolean).join(' ')
    )
    .join('\n');
}

function drawCompactHeader(doc, { title, subtitle, president }) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.page.margins.top;
  const logo = resolveBrandImage(ASSOCIATION_BRAND.logoFile);
  let y = top;
  if (logo) {
    doc.image(logo, left, y, { width: 40 });
  }
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#5b2d8e')
    .text(ASSOCIATION_BRAND.shortName, left + 48, y, {
      width: right - left - 48,
    });
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#111')
    .text(title, left + 48, doc.y, { width: right - left - 48 });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#555')
    .text(subtitle, left + 48, doc.y + 1, { width: right - left - 48 });
  if (president?.name) {
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#666')
      .text(
        `Letterhead signer: ${president.name} (${president.role || 'President'})`,
        left + 48,
        doc.y + 1,
        { width: right - left - 48 }
      );
  }
  y = Math.max(doc.y, top + (logo ? 44 : 28)) + 6;
  doc
    .moveTo(left, y)
    .lineTo(right, y)
    .strokeColor('#5b2d8e')
    .lineWidth(0.8)
    .stroke();
  return y + 8;
}

/**
 * @param {import('express').Response} res
 * @param {object[]} flats
 * @param {{ associationId?: string, kind?: 'verification'|'register' }} [opts]
 */
export async function streamFlatRegisterPdf(res, flats, opts = {}) {
  const kind = opts.kind === 'register' ? 'register' : 'verification';
  const letterhead = await loadLetterheadBoard(
    prisma,
    opts.associationId || process.env.ASSOCIATION_ID
  );

  const kindLabel =
    kind === 'register'
      ? 'master-register'
      : 'verification-sheet';
  const fileName = `flats-${kindLabel}-${formatDate(new Date()).replace(/\s/g, '-')}.pdf`;

  const doc = new PDFDocument({
    margin: 28,
    size: 'A4',
    layout: 'landscape',
    bufferPages: true,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fileName}"`
  );
  doc.pipe(res);

  const title =
    kind === 'register'
      ? 'FLAT & HOUSEHOLD MASTER REGISTER'
      : 'FLAT VERIFICATION WALK SHEET';
  const subtitle =
    kind === 'register'
      ? `${ASSOCIATION_BRAND.campus} · Office reference · ${flats.length} flat(s) · ${formatDate(new Date())}`
      : `${ASSOCIATION_BRAND.campus} · Physical check · Tick OK after verifying · ${flats.length} flat(s) · ${formatDate(new Date())}`;

  let y = drawCompactHeader(doc, {
    title,
    subtitle,
    president: letterhead.president,
  });

  const cols =
    kind === 'register'
      ? REGISTER_COLS
      : VERIFICATION_COLS;

  y = drawTable(doc, flats, cols, y, { kind });

  doc.end();
}

const VERIFICATION_COLS = [
  { key: 'flat', label: 'Flat', width: 52 },
  { key: 'floor', label: 'Flr', width: 22 },
  { key: 'occ', label: 'Occupancy', width: 52 },
  { key: 'members', label: 'Members', width: 110 },
  { key: 'parking', label: 'Parking + letter', width: 100 },
  { key: 'vehicles', label: 'Vehicles', width: 90 },
  { key: 'pets', label: 'Pets', width: 55 },
  { key: 'contacts', label: 'Emergency', width: 70 },
  { key: 'devices', label: 'Access', width: 55 },
  { key: 'ok', label: 'OK', width: 22 },
  { key: 'by', label: 'By / date', width: 58 },
];

const REGISTER_COLS = [
  { key: 'flat', label: 'Flat', width: 52 },
  { key: 'meta', label: 'Floor / type / notes', width: 95 },
  { key: 'occ', label: 'Occupancy', width: 48 },
  { key: 'members', label: 'Members', width: 115 },
  { key: 'parking', label: 'Parking + letter', width: 105 },
  { key: 'vehicles', label: 'Vehicles', width: 95 },
  { key: 'pets', label: 'Pets', width: 60 },
  { key: 'contacts', label: 'Emergency', width: 75 },
  { key: 'devices', label: 'Access', width: 60 },
];

function rowCells(flat, kind) {
  const campus = formatCampusFlatId(flat.tower, flat.flatNumber);
  const base = {
    flat: campus,
    floor: floorLabel(flat.floor),
    occ: OCC[flat.occupancyStatus] || flat.occupancyStatus || '—',
    members: membersCell(flat.members),
    parking: parkingCell(flat),
    vehicles: vehiclesCell(flat.vehicles),
    pets: petsCell(flat.pets),
    contacts: contactsCell(flat.emergencyContacts),
    devices: devicesCell(flat.accessDevices),
  };
  if (kind === 'register') {
    const type = [flat.apartmentType, flat.configuration]
      .filter(Boolean)
      .join(' · ');
    base.meta = [
      `Flr ${floorLabel(flat.floor)}`,
      type || '—',
      flat.notes ? `Note: ${flat.notes}` : null,
      `Entitled parks: ${flat.parkingSlots ?? 0}`,
    ]
      .filter(Boolean)
      .join('\n');
  } else {
    base.ok = '☐';
    base.by = '';
  }
  return base;
}

function measureRowHeight(doc, cells, cols, pad = 4) {
  let max = 16;
  for (const col of cols) {
    const text = String(cells[col.key] ?? '—');
    const h = doc.heightOfString(text, {
      width: col.width - pad * 2,
      lineGap: 1,
    });
    max = Math.max(max, h + pad * 2);
  }
  return Math.min(max, 90);
}

function drawTableHeader(doc, cols, y, left) {
  const h = 18;
  let x = left;
  doc.rect(left, y, cols.reduce((s, c) => s + c.width, 0), h).fill('#5b2d8e');
  for (const col of cols) {
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#fff')
      .text(col.label, x + 3, y + 5, {
        width: col.width - 6,
        lineBreak: false,
      });
    x += col.width;
  }
  return y + h;
}

function drawTable(doc, flats, cols, startY, { kind }) {
  const left = doc.page.margins.left;
  const bottom = doc.page.height - doc.page.margins.bottom;
  let y = startY;
  const tableW = cols.reduce((s, c) => s + c.width, 0);

  y = drawTableHeader(doc, cols, y, left);

  doc.font('Helvetica').fontSize(7).fillColor('#111');

  for (let i = 0; i < flats.length; i += 1) {
    const cells = rowCells(flats[i], kind);
    const rowH = measureRowHeight(doc, cells, cols);

    if (y + rowH > bottom) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
      y = drawCompactHeader(doc, {
        title:
          kind === 'register'
            ? 'FLAT & HOUSEHOLD MASTER REGISTER (cont.)'
            : 'FLAT VERIFICATION WALK SHEET (cont.)',
        subtitle: `${ASSOCIATION_BRAND.shortName} · continued · ${formatDate(new Date())}`,
        president: null,
      });
      y = drawTableHeader(doc, cols, y, left);
      doc.font('Helvetica').fontSize(7).fillColor('#111');
    }

    if (i % 2 === 1) {
      doc.rect(left, y, tableW, rowH).fill('#f6f1fb');
    }
    doc.rect(left, y, tableW, rowH).strokeColor('#ccc').lineWidth(0.4).stroke();

    let x = left;
    for (const col of cols) {
      const text = String(cells[col.key] ?? '—');
      doc
        .fillColor('#111')
        .font(col.key === 'ok' ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(col.key === 'ok' ? 11 : 7)
        .text(text, x + 3, y + 3, {
          width: col.width - 6,
          height: rowH - 4,
          lineGap: 1,
        });
      doc
        .moveTo(x + col.width, y)
        .lineTo(x + col.width, y + rowH)
        .strokeColor('#ddd')
        .lineWidth(0.3)
        .stroke();
      x += col.width;
    }
    y += rowH;
  }

  y += 8;
  if (y + 20 < bottom) {
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#555')
      .text(
        kind === 'verification'
          ? 'Letter column: On file = slot letter, On file (flat) = flat fallback, Missing = attach in Household → Parking (optional). Open letters in the app — not embedded here.'
          : 'Master register for office use. Parking letter status only; open scans from Household → Parking.',
        left,
        y,
        { width: tableW }
      );
  }

  return y;
}
