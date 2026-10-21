import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const brandAssetsDir = path.resolve(__dirname, '../../assets');

export const ASSOCIATION_BRAND = {
  shortName: 'NHPAOWA',
  fullName:
    'New Haven Peenya Apartment Owners Welfare Association (NHPAOWA)',
  campus: 'TATA New Haven · Bengaluru',
  tagline: 'Working together for Better Living',
  logoFile: 'nhpaowa-logo.png',
  markFile: 'nhpaowa-mark.png',
  signatureFile: 'president-signature.png',
};

/** Fallback if DB register is empty */
export const DEFAULT_BOARD_MEMBERS = [
  { role: 'President', name: 'V. G. Jayaramaiah' },
  { role: 'Vice President', name: 'Lokesh Kumar Gupta' },
  { role: 'Secretary', name: 'Adarsh A Patil' },
  { role: 'Joint Secretary', name: 'Moushimi Chakraborty' },
  { role: 'Treasurer', name: 'Praveen Danagowdru' },
  { role: 'Committee Member', name: 'Vikas' },
  { role: 'Committee Member', name: 'Saurabh' },
  { role: 'Committee Member', name: 'Ranjitha' },
  { role: 'Estate Manager', name: 'Mariyayya Swamy' },
];

export function brandAssetPath(fileName) {
  return path.join(brandAssetsDir, fileName);
}

export function resolveBrandImage(fileName) {
  const p = brandAssetPath(fileName);
  return fs.existsSync(p) ? p : null;
}

/**
 * Load active letterhead board from DB.
 * @returns {Promise<{ members: {role:string,name:string}[], president: {role:string,name:string} }>}
 */
export async function loadLetterheadBoard(prisma, associationId) {
  if (!prisma || !associationId) {
    return fallbackLetterhead();
  }
  try {
    const roles = await prisma.officeBearerRole.findMany({
      where: {
        associationId,
        active: true,
        deletedAt: null,
        showOnLetterhead: true,
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        members: {
          where: { active: true, deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const members = [];
    let president = null;
    for (const role of roles) {
      for (const m of role.members) {
        members.push({ role: role.name, name: m.fullName });
        if (role.isPresidentSigner && !president) {
          president = { role: role.name, name: m.fullName };
        }
      }
    }
    if (!members.length) return fallbackLetterhead();
    if (!president) {
      president = members.find((m) => /president/i.test(m.role)) || members[0];
    }
    return { members, president };
  } catch {
    return fallbackLetterhead();
  }
}

function fallbackLetterhead() {
  const members = DEFAULT_BOARD_MEMBERS.map((m) => ({ ...m }));
  const president =
    members.find((m) => m.role === 'President') || members[0];
  return { members, president };
}

/**
 * Draw NHPAOWA letterhead: logo + title centered, board members on the left.
 */
export function drawAssociationLetterhead(
  doc,
  { docTitle = 'NOTICE', boardMembers, president } = {}
) {
  const brand = ASSOCIATION_BRAND;
  const members =
    boardMembers?.length > 0 ? boardMembers : DEFAULT_BOARD_MEMBERS;
  const pageLeft = doc.page.margins.left;
  const pageRight = doc.page.width - doc.page.margins.right;
  const top = doc.page.margins.top;
  // Compact left rail — avoid a wide empty gutter beside short names
  const leftColWidth = 108;
  const gutter = 10;
  const contentLeft = pageLeft + leftColWidth + gutter;
  const contentWidth = pageRight - contentLeft;

  const logoPath = resolveBrandImage(brand.logoFile);
  const markPath = resolveBrandImage(brand.markFile);
  let headerBottom = top;

  if (logoPath) {
    const logoW = 72;
    const logoX = pageLeft + (pageRight - pageLeft - logoW) / 2;
    doc.image(logoPath, logoX, top, { width: logoW });
    headerBottom = top + 78;
  } else if (markPath) {
    const logoW = 48;
    const logoX = pageLeft + (pageRight - pageLeft - logoW) / 2;
    doc.image(markPath, logoX, top, { width: logoW });
    headerBottom = top + 54;
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#5b2d8e')
    .text(brand.shortName, pageLeft, headerBottom + 4, {
      width: pageRight - pageLeft,
      align: 'center',
    });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#444')
    .text(brand.fullName, pageLeft, doc.y + 2, {
      width: pageRight - pageLeft,
      align: 'center',
    });
  doc
    .fontSize(8)
    .text(`${brand.campus} · ${brand.tagline}`, pageLeft, doc.y + 1, {
      width: pageRight - pageLeft,
      align: 'center',
    });

  headerBottom = doc.y + 8;
  doc
    .moveTo(pageLeft, headerBottom)
    .lineTo(pageRight, headerBottom)
    .strokeColor('#5b2d8e')
    .lineWidth(1)
    .stroke();

  const bodyTop = headerBottom + 12;

  // Left board column (absolute positions — do not rely on PDFKit flow x)
  let boardY = bodyTop;
  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor('#5b2d8e')
    .text('BOARD MEMBERS', pageLeft, boardY, {
      width: leftColWidth,
      lineBreak: false,
    });
  boardY += 12;
  doc.fillColor('#222');
  for (const member of members) {
    doc
      .font('Helvetica-Bold')
      .fontSize(6.5)
      .text(member.role, pageLeft, boardY, {
        width: leftColWidth,
        lineBreak: false,
      });
    boardY += 9;
    doc
      .font('Helvetica')
      .fontSize(7)
      .text(member.name, pageLeft, boardY, {
        width: leftColWidth,
      });
    boardY = Math.max(boardY + 9, doc.y + 4);
  }

  // Subtle divider between board rail and notice body
  doc
    .moveTo(contentLeft - gutter / 2, bodyTop)
    .lineTo(contentLeft - gutter / 2, Math.max(boardY, bodyTop + 40))
    .strokeColor('#d4c4e8')
    .lineWidth(0.6)
    .stroke();

  // Notice title starts at top of content column (not after board flow)
  doc
    .font('Times-Bold')
    .fontSize(12)
    .fillColor('#000')
    .text(docTitle, contentLeft, bodyTop, {
      width: contentWidth,
      align: 'center',
    });

  const bodyStartY = doc.y + 8;
  return {
    contentLeft,
    contentWidth,
    bodyStartY,
    pageLeft,
    pageRight,
    president:
      president ||
      members.find((m) => /president/i.test(m.role)) ||
      members[0],
  };
}

export function drawPresidentSignature(doc, { x, width, president } = {}) {
  const brand = ASSOCIATION_BRAND;
  const signer =
    president ||
    DEFAULT_BOARD_MEMBERS.find((m) => m.role === 'President') ||
    DEFAULT_BOARD_MEMBERS[0];
  const pageLeft = x ?? doc.page.margins.left;
  const usableWidth =
    width ?? doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const sigX = pageLeft + usableWidth - 180;
  let y = Math.max(doc.y + 24, doc.page.height - doc.page.margins.bottom - 110);

  const sigPath = resolveBrandImage(brand.signatureFile);
  if (sigPath) {
    doc.image(sigPath, sigX, y, { width: 140, height: 42, fit: [140, 42] });
    y += 46;
  } else {
    doc
      .font('Times-Italic')
      .fontSize(14)
      .fillColor('#111')
      .text(signer.name, sigX, y, { width: 160 });
    y = doc.y + 4;
  }

  doc
    .moveTo(sigX, y)
    .lineTo(sigX + 150, y)
    .strokeColor('#333')
    .lineWidth(0.6)
    .stroke();
  y += 6;
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#000')
    .text(signer.name, sigX, y, { width: 160 });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#444')
    .text(`${signer.role || 'President'}, ${brand.shortName}`, sigX, doc.y + 1, {
      width: 160,
    });
}
