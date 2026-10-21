-- Run once in Supabase SQL Editor (Dashboard → SQL → New query).
-- Do NOT create a schema named "auth" — Supabase already owns that for GoTrue.
-- App tables for inventory/association/identity live in public (Prisma default).
-- Bus tables live in bus_tracking.

CREATE SCHEMA IF NOT EXISTS bus_tracking;

-- Allow the API role (postgres / service role connections) to use the schema.
GRANT USAGE ON SCHEMA bus_tracking TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA bus_tracking TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA bus_tracking TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA bus_tracking
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA bus_tracking
  GRANT ALL ON SEQUENCES TO postgres, service_role;
