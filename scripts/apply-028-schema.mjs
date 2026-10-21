import pg from 'pg';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query(
  `ALTER TABLE flats ADD COLUMN IF NOT EXISTS collection_phase TEXT NOT NULL DEFAULT 'SEED'`
);
await c.query(`
CREATE TABLE IF NOT EXISTS flat_update_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL,
  flat_id UUID NOT NULL REFERENCES flats(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);
await c.query(
  `CREATE INDEX IF NOT EXISTS flat_update_sessions_assoc_flat_idx ON flat_update_sessions(association_id, flat_id)`
);
await c.query(`
CREATE TABLE IF NOT EXISTS flat_self_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL,
  flat_id UUID NOT NULL REFERENCES flats(id),
  phase TEXT NOT NULL DEFAULT 'P1',
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  phone_last4_used TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);
await c.query(
  `CREATE INDEX IF NOT EXISTS flat_self_updates_assoc_status_idx ON flat_self_updates(association_id, status)`
);
await c.query(
  `CREATE INDEX IF NOT EXISTS flat_self_updates_flat_idx ON flat_self_updates(flat_id)`
);
await c.query(
  `CREATE INDEX IF NOT EXISTS flats_assoc_phase_idx ON flats(association_id, collection_phase)`
);
console.log('028 schema ok');
await c.end();
