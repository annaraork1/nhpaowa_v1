import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/nhpaowa?schema=public';

const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS staff_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      association_id UUID NOT NULL,
      code TEXT NOT NULL,
      label TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS staff_categories_association_id_code_key
      ON staff_categories (association_id, code)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS staff_categories_association_id_active_sort_order_idx
      ON staff_categories (association_id, active, sort_order)
  `);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE staff_categories OWNER TO nhpaowa`
  );
  await prisma.$executeRawUnsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON staff_categories TO nhpaowa`
  );
  console.log('OK staff_categories');
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
