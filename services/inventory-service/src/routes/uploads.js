import { Router } from 'express';
import { createUploadMiddleware } from '../lib/multerUpload.js';
import { persistMulterFile, uploadRoot } from '../lib/storage.js';

const upload = createUploadMiddleware({
  subdir: '',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    return cb(null, true);
  },
});

export function createUploadsRouter({ requirePermission }) {
  const router = Router();

  router.post(
    '/',
    requirePermission('items', 'createEdit'),
    upload.single('photo'),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
        const saved = await persistMulterFile(req.file, '');
        res.status(201).json({ url: saved.url, filename: saved.filename });
      } catch (e) {
        next(e);
      }
    },
  );

  return router;
}

export { uploadRoot };
