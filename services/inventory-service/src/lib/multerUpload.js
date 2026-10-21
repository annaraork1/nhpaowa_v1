import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  ensureDiskRoot,
  safeFilename,
  uploadRoot,
  useObjectStorage,
} from './storage.js';

/**
 * Multer middleware: memory (Supabase) or disk under uploadRoot/subdir.
 */
export function createUploadMiddleware({
  subdir = '',
  limits = { fileSize: 5 * 1024 * 1024 },
  fileFilter,
} = {}) {
  ensureDiskRoot();
  const rel = String(subdir || '').replace(/^\/+|\/+$/g, '');

  if (useObjectStorage()) {
    return multer({
      storage: multer.memoryStorage(),
      limits,
      fileFilter,
    });
  }

  const dest = path.resolve(uploadRoot, rel);
  fs.mkdirSync(dest, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dest),
      filename: (_req, file, cb) => cb(null, safeFilename(file.originalname)),
    }),
    limits,
    fileFilter,
  });
}
