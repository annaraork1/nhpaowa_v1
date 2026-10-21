#!/usr/bin/env node
// Captures documentation screenshots from a running NHPAOWA instance.
//
//   APP_URL   web app (default http://localhost:5173)
//   AUTH_URL  identity API (default http://localhost:4000/api/auth)
//   CHROME_PATH  optional browser executable (Chrome / Edge / Chromium)
//   ONLY      optional comma-separated shot names to capture
//
// Requires identity, inventory, bus services and the web app to be running
// with seeded demo data (password123 for all demo accounts).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/screenshots');
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const AUTH_URL = (process.env.AUTH_URL || 'http://127.0.0.1:4000/api/auth').replace(/\/$/, '');
const PASSWORD = 'password123';
const ONLY = (process.env.ONLY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ACCOUNTS = {
  superadmin: 'superadmin@nhpaowa.local',
  secretary: 'secretary@nhpaowa.local',
  treasurer: 'treasurer@nhpaowa.local',
  securityStaff: 'security.staff@nhpaowa.local',
  securityHead: 'security.head@nhpaowa.local',
  resident: 'resident@nhpaowa.local',
  vendor: 'vendor@shree.local',
};

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

/** name → { path, as (account key | null), theme, viewport, fullPage } */
const SHOTS = [
  { name: 'login', path: '/login', as: null },
  { name: 'home', path: '/', as: 'secretary' },
  { name: 'dashboard', path: '/dashboard', as: 'secretary' },
  { name: 'dashboard-dark', path: '/dashboard', as: 'secretary', theme: 'dark' },
  { name: 'users', path: '/users', as: 'superadmin' },
  { name: 'flats', path: '/flats', as: 'secretary' },
  { name: 'flat-self-updates', path: '/flats/self-updates', as: 'secretary' },
  { name: 'noc', path: '/noc', as: 'secretary' },
  { name: 'notices', path: '/notices', as: 'secretary' },
  { name: 'board', path: '/board', as: 'superadmin' },
  { name: 'attendance', path: '/attendance', as: 'secretary' },
  { name: 'moves', path: '/moves', as: 'secretary' },
  { name: 'bus-gate', path: '/buses/gate', as: 'securityStaff' },
  { name: 'bus-schools', path: '/buses/schools', as: 'secretary' },
  { name: 'bus-batches', path: '/buses/batches', as: 'secretary' },
  { name: 'bus-reports', path: '/buses/reports', as: 'secretary' },
  { name: 'items', path: '/items', as: 'secretary' },
  { name: 'categories', path: '/categories', as: 'secretary' },
  { name: 'suppliers', path: '/suppliers', as: 'secretary' },
  { name: 'warehouses', path: '/warehouses', as: 'secretary' },
  { name: 'barcodes', path: '/barcodes', as: 'secretary' },
  { name: 'purchase-orders', path: '/purchase-orders', as: 'secretary' },
  { name: 'requisitions', path: '/requisitions', as: 'secretary' },
  { name: 'stock', path: '/stock', as: 'secretary' },
  { name: 'transactions', path: '/transactions', as: 'secretary' },
  { name: 'amc', path: '/amc', as: 'secretary' },
  { name: 'alerts', path: '/alerts', as: 'secretary' },
  { name: 'reports', path: '/reports', as: 'secretary' },
  { name: 'settings', path: '/settings', as: 'secretary' },
  { name: 'vendor-portal', path: '/vendor', as: 'vendor' },
  { name: 'resident-home', path: '/', as: 'resident' },
  { name: 'resident-buses', path: '/buses/today', as: 'resident' },
  { name: 'flat-update', path: '/flat-update', as: null },
  { name: 'flat-update-share', path: '/flat-update/share', as: null },
  { name: 'flat-update-paper', path: '/flat-update/paper', as: null },
  { name: 'mobile-home', path: '/', as: 'secretary', viewport: MOBILE },
  { name: 'mobile-flats', path: '/flats', as: 'secretary', viewport: MOBILE },
  { name: 'mobile-attendance', path: '/attendance', as: 'securityStaff', viewport: MOBILE },
];

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error('No Chrome/Edge/Chromium found. Set CHROME_PATH to a browser executable.');
  }
  return found;
}

const sessions = new Map();

async function login(accountKey) {
  if (sessions.has(accountKey)) return sessions.get(accountKey);
  const email = ACCOUNTS[accountKey];
  const res = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status} ${await res.text()}`);
  }
  const session = await res.json();
  sessions.set(accountKey, session);
  return session;
}

async function capture(browser, shot) {
  const viewport = shot.viewport || DESKTOP;
  const session = shot.as ? await login(shot.as) : null;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: viewport === MOBILE,
    hasTouch: viewport === MOBILE,
  });

  await context.addInitScript(
    ({ session: s, theme }) => {
      localStorage.setItem('nhpaowa_theme', theme);
      sessionStorage.setItem('nhpaowa_pwa_install_dismissed', '1');
      if (s) {
        localStorage.setItem('nhpaowa_token', s.token);
        localStorage.setItem('nhpaowa_user', JSON.stringify(s.user));
        localStorage.setItem('nhpaowa_role', s.user.role);
      }
    },
    { session, theme: shot.theme || 'light' }
  );

  const page = await context.newPage();
  await page.goto(`${APP_URL}${shot.path}`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(1200);
  const file = path.join(OUT_DIR, `${shot.name}.png`);
  await page.screenshot({ path: file, fullPage: Boolean(shot.fullPage) });
  await context.close();
  return file;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const executablePath = findBrowser();
  console.log(`Browser: ${executablePath}`);
  console.log(`App:     ${APP_URL}`);
  const browser = await chromium.launch({ executablePath, headless: true });

  const shots = ONLY.length ? SHOTS.filter((s) => ONLY.includes(s.name)) : SHOTS;
  let failed = 0;
  for (const shot of shots) {
    try {
      const file = await capture(browser, shot);
      console.log(`  ok   ${shot.name.padEnd(20)} ${path.relative(process.cwd(), file)}`);
    } catch (err) {
      failed += 1;
      console.error(`  FAIL ${shot.name.padEnd(20)} ${err.message}`);
    }
  }
  await browser.close();
  console.log(`\n${shots.length - failed}/${shots.length} screenshots captured.`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
