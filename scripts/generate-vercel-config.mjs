/**
 * Emit vercel.json from HOSTING_MODE + upstream env.
 *
 * Modes:
 *   docker            — no-op (keeps committed SPA vercel.json)
 *   vercel-spa        — static SPA + optional rewrites to external Express APIs
 *   vercel-fullstack  — SPA + serverless Express + Cron (Supabase DB/Storage)
 *
 * Usage:
 *   npm run vercel:config
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'vercel.json');

const mode = (process.env.HOSTING_MODE || 'docker').trim().toLowerCase();

const spaHeaders = [
  {
    source: '/sw.js',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
  },
  {
    source: '/manifest.webmanifest',
    headers: [
      { key: 'Content-Type', value: 'application/manifest+json' },
      { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
    ],
  },
];

function stripTrailingSlash(url) {
  return String(url || '').replace(/\/+$/, '');
}

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return stripTrailingSlash(url).replace(/\/api\/.*$/, '');
  }
}

function apiDestination(upstream, apiPrefix) {
  const base = stripTrailingSlash(upstream);
  if (base.endsWith(apiPrefix)) {
    return `${base}/:path*`;
  }
  return `${base}${apiPrefix}/:path*`;
}

function writeConfig(config) {
  writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

if (mode === 'docker') {
  console.log(
    '[generate-vercel-config] HOSTING_MODE=docker — skipping write (committed vercel.json is for Vercel deploys).',
  );
  process.exit(0);
}

if (mode === 'vercel-fullstack') {
  const config = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    version: 2,
    framework: null,
    installCommand: 'npm ci',
    buildCommand: 'npm run vercel:build',
    outputDirectory: 'apps/web/dist',
    rewrites: [
      { source: '/api/auth/:path*', destination: '/api/identity-service' },
      { source: '/api/inventory/:path*', destination: '/api/inventory-service' },
      { source: '/api/association/:path*', destination: '/api/inventory-service' },
      { source: '/uploads/:path*', destination: '/api/inventory-service' },
      { source: '/api/bus/:path*', destination: '/api/bus-service' },
      { source: '/api/cron', destination: '/api/cron' },
      { source: '/(.*)', destination: '/index.html' },
    ],
    headers: spaHeaders,
    crons: [
      { path: '/api/cron?job=inventory', schedule: '0 2 * * *' },
      { path: '/api/cron?job=bus', schedule: '*/5 * * * *' },
    ],
    functions: {
      'api/**/*.js': {
        includeFiles: '{services,packages,node_modules/@prisma,node_modules/.prisma}/**',
        maxDuration: 60,
      },
    },
  };
  writeConfig(config);
  console.log(
    `[generate-vercel-config] Wrote ${outPath} (HOSTING_MODE=vercel-fullstack). Set DATABASE_URL (pooler), DATABASE_URL_UNPOOLED, SUPABASE_*, CRON_SECRET, JWT_SECRET on Vercel.`,
  );
  process.exit(0);
}

if (mode !== 'vercel-spa') {
  console.error(
    `[generate-vercel-config] Unknown HOSTING_MODE="${mode}". Use docker | vercel-spa | vercel-fullstack.`,
  );
  process.exit(1);
}

const proxy = stripTrailingSlash(process.env.API_PROXY_ORIGIN || '');
const identity = stripTrailingSlash(process.env.IDENTITY_UPSTREAM || proxy);
const inventory = stripTrailingSlash(process.env.INVENTORY_UPSTREAM || proxy);
const bus = stripTrailingSlash(process.env.BUS_UPSTREAM || proxy);

const apiRewrites = [];

if (identity) {
  apiRewrites.push({
    source: '/api/auth/:path*',
    destination: apiDestination(identity, '/api/auth'),
  });
}

if (inventory) {
  apiRewrites.push({
    source: '/api/inventory/:path*',
    destination: apiDestination(inventory, '/api/inventory'),
  });
  apiRewrites.push({
    source: '/api/association/:path*',
    destination: apiDestination(inventory, '/api/association'),
  });
  apiRewrites.push({
    source: '/uploads/:path*',
    destination: `${originOf(inventory)}/uploads/:path*`,
  });
}

if (bus) {
  apiRewrites.push({
    source: '/api/bus/:path*',
    destination: apiDestination(bus, '/api/bus'),
  });
}

if (!apiRewrites.length) {
  console.warn(
    `[generate-vercel-config] vercel-spa: no upstreams set — SPA-only. Set absolute VITE_* or re-run with API_PROXY_ORIGIN.`,
  );
}

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  version: 2,
  framework: null,
  installCommand: 'npm ci',
  buildCommand: 'npm run build -w @nhpaowa/web',
  outputDirectory: 'apps/web/dist',
  rewrites: [...apiRewrites, { source: '/(.*)', destination: '/index.html' }],
  headers: spaHeaders,
};

writeConfig(config);
console.log(
  `[generate-vercel-config] Wrote ${outPath} (HOSTING_MODE=vercel-spa, ${apiRewrites.length} API rewrite(s)).`,
);
