import { PrismaClient } from '@prisma/client';

// Connect as postgres owner to alter tables created earlier under that role
process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/nhpaowa?schema=public';

const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE association_staff
      ADD COLUMN IF NOT EXISTS tower TEXT,
      ADD COLUMN IF NOT EXISTS designation TEXT
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS association_staff_association_id_category_idx
      ON association_staff (association_id, category)
  `);
  await prisma.$executeRawUnsafe(`
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nhpaowa
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE association_staff OWNER TO nhpaowa
  `);
  // Best-effort: reassign other association tables if still owned by postgres
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tableowner = 'postgres'
  `);
  for (const t of tables) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${t.tablename}" OWNER TO nhpaowa`
    );
  }
  console.log('OK: tower/designation columns + ownership');
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
