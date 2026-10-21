import { PrismaClient } from '@prisma/client';
import { generateNoticePdf } from '../services/inventory-service/src/lib/noticePdf.js';

const prisma = new PrismaClient();
const ASSOCIATION_ID =
  process.env.ASSOCIATION_ID || '00000000-0000-4000-8000-000000000001';

const published = await prisma.notice.findMany({
  where: { associationId: ASSOCIATION_ID, status: 'PUBLISHED' },
});

for (const notice of published) {
  const pdf = await generateNoticePdf({
    noticeId: notice.id,
    title: notice.title,
    body: notice.body,
    category: notice.category,
    publishedAt: notice.publishedAt || new Date(),
    publishedByName: notice.publishedByName || 'Secretary',
  });
  await prisma.notice.update({
    where: { id: notice.id },
    data: { pdfFileName: pdf.fileName, pdfPath: pdf.publicPath },
  });
  console.log('Regenerated', notice.title, '->', pdf.fileName);
}

await prisma.$disconnect();
