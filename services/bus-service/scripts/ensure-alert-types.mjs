import pg from 'pg';

const client = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://nhpaowa:nhpaowa@localhost:5432/nhpaowa?schema=public',
});

await client.connect();
await client.query('CREATE SCHEMA IF NOT EXISTS bus_tracking');
const variants = [
  'BUS_UNMATCHED_TRIP',
  'BUS_LONG_WAIT',
  'BUS_OFF_SLOT',
  'BUS_BATCH_CAPACITY',
  'BUS_AM_PM_MISMATCH',
];
for (const v of variants) {
  try {
    await client.query(`ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS '${v}'`);
    console.log('ok', v);
  } catch (e) {
    console.log('skip', v, e.message);
  }
}
await client.end();
