/**
 * Upload backend: local disk (docker / VPS) or Supabase Storage (Vercel fullstack).
 *
 * Object storage when HOSTING_MODE=vercel-fullstack (or STORAGE_BACKEND=supabase)
 * and SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadRoot = path.resolve(__dirname, '../../uploads');

const mode = (process.env.HOSTING_MODE || 'docker').toLowerCase();
const backendEnv = (process.env.STORAGE_BACKEND || '').toLowerCase();

export function useObjectStorage() {
  if (backendEnv === 'disk') return false;
  if (backendEnv === 'supabase') return true;
  return mode === 'vercel-fullstack';
}

let supabase;
function getSupabase() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Object storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }
  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

export function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
}

export function safeFilename(originalname) {
  const safe = String(originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}-${safe}`;
}

/** Public URL path stored in DB / returned to clients (always /uploads/...). */
export function publicUploadPath(relativeKey) {
  const key = String(relativeKey).replace(/^\/+/, '');
  return `/uploads/${key}`;
}

/**
 * Persist a buffer (or multer memory file) under a relative key, e.g. "staff/foo.jpg".
 * @returns {{ url: string, key: string, filename: string }}
 */
export async function saveUploadBuffer(relativeDir, buffer, originalname, contentType) {
  const filename = safeFilename(originalname);
  const dir = String(relativeDir || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\\/g, '/');
  const key = dir ? `${dir}/${filename}` : filename;

  if (useObjectStorage()) {
    const { error } = await getSupabase()
      .storage.from(storageBucket())
      .upload(key, buffer, {
        contentType: contentType || 'application/octet-stream',
        upsert: false,
      });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return { url: publicUploadPath(key), key, filename };
  }

  const destDir = path.resolve(uploadRoot, dir);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, filename), buffer);
  return { url: publicUploadPath(key), key, filename };
}

/** After multer (disk or memory), normalize to { url, filename }. */
export async function persistMulterFile(file, relativeDir = '') {
  if (!file) throw new Error('No file uploaded');

  if (file.buffer) {
    return saveUploadBuffer(
      relativeDir,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  // diskStorage: file already on disk under uploadRoot/relativeDir
  const filename = file.filename;
  const key = relativeDir
    ? `${relativeDir.replace(/^\/+|\/+$/g, '')}/${filename}`
    : filename;
  return { url: publicUploadPath(key), key, filename };
}

/**
 * Stream or redirect a stored object for GET /uploads/*
 * @returns {Promise<{ kind: 'disk', absPath: string } | { kind: 'redirect', url: string } | { kind: 'buffer', buffer: Buffer, contentType: string }>}
 */
export async function resolveUpload(relativeKey) {
  const key = String(relativeKey || '')
    .replace(/^\/+/, '')
    .replace(/\\/g, '/');
  if (!key || key.includes('..')) {
    const err = new Error('Invalid path');
    err.status = 400;
    throw err;
  }

  if (useObjectStorage()) {
    const { data, error } = await getSupabase()
      .storage.from(storageBucket())
      .createSignedUrl(key, 60 * 60);
    if (error || !data?.signedUrl) {
      const err = new Error(error?.message || 'Not found');
      err.status = 404;
      throw err;
    }
    return { kind: 'redirect', url: data.signedUrl };
  }

  const absPath = path.resolve(uploadRoot, key);
  if (!absPath.startsWith(uploadRoot) || !fs.existsSync(absPath)) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return { kind: 'disk', absPath };
}

export function ensureDiskRoot() {
  if (!useObjectStorage()) {
    fs.mkdirSync(uploadRoot, { recursive: true });
  }
}
