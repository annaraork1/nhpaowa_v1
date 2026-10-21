#!/usr/bin/env node
/**
 * Reset NHPAOWA inventory data to a clean seeded state.
 *
 * DESTROYS all rows in the Postgres database pointed at by DATABASE_URL,
 * re-applies the Prisma schema, re-seeds demo data, and clears uploaded files.
 *
 * Does nothing unless you pass --yes (or set CONFIRM_RESET=YES).
 *
 * Usage (from repo root):
 *   npm run db:reset -- --yes
 *   node --env-file=.env scripts/reset-data.mjs --yes
 *
 * Optional:
 *   --keep-uploads   skip clearing services/inventory-service/uploads
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const schema = path.join(
  root,
  'services',
  'inventory-service',
  'prisma',
  'schema.prisma'
);
const uploadRoot = path.join(root, 'services', 'inventory-service', 'uploads');

const args = new Set(process.argv.slice(2));
const confirmed =
  args.has('--yes') ||
  args.has('-y') ||
  process.env.CONFIRM_RESET === 'YES';
const keepUploads = args.has('--keep-uploads');

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function run(command, commandArgs, opts = {}) {
  console.log(`\n› ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...opts.env },
  });
  if (result.status !== 0) {
    fail(`Command failed with exit code ${result.status ?? 1}`);
  }
}

function clearUploads() {
  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
    console.log(`\n› created empty uploads dir: ${uploadRoot}`);
    return;
  }

  const entries = fs.readdirSync(uploadRoot);
  let removed = 0;
  for (const name of entries) {
    if (name === '.gitkeep') continue;
    fs.rmSync(path.join(uploadRoot, name), { recursive: true, force: true });
    removed += 1;
  }
  console.log(`\n› cleared ${removed} file(s) from uploads: ${uploadRoot}`);
}

if (!confirmed) {
  console.log(`
NHPAOWA data reset (DRY RUN — nothing was changed)

This will:
  1. Drop and recreate all tables (prisma db push --force-reset)
  2. Re-seed demo users, categories, items, POs, etc.
  3. Delete uploaded item photos under services/inventory-service/uploads
     (unless you pass --keep-uploads)

Database: ${process.env.DATABASE_URL || '(DATABASE_URL not set)'}

To run for real:
  npm run db:reset -- --yes
`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  fail('DATABASE_URL is not set. Use: node --env-file=.env scripts/reset-data.mjs --yes');
}

if (!fs.existsSync(schema)) {
  fail(`Prisma schema not found: ${schema}`);
}

console.log(`
NHPAOWA data reset starting
  DATABASE_URL host/db: ${process.env.DATABASE_URL.replace(/:[^:@/]+@/, ':***@')}
  schema: ${schema}
  clear uploads: ${keepUploads ? 'no' : 'yes'}
`);

run('npx', [
  'prisma',
  'db',
  'push',
  '--force-reset',
  '--accept-data-loss',
  `--schema=${schema}`,
]);

run('npx', ['prisma', 'generate', `--schema=${schema}`]);

run('npm', ['run', 'prisma:seed', '-w', '@nhpaowa/inventory-service']);

if (!keepUploads) {
  clearUploads();
}

console.log(`
✔ Reset complete. Demo logins (password: password123):
  superadmin@nhpaowa.local   (Users admin)
  secretary@nhpaowa.local
  treasurer@nhpaowa.local
  staff@nhpaowa.local
  resident@nhpaowa.local
  vendor@shree.local
`);
