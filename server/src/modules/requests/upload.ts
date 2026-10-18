import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { env } from '../../config/env.js';
import { AppError, badRequest } from '../../utils/errors.js';
import { getStorage } from '../../services/storage.js';

const ALLOWED: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Memory storage: the file is validated by content before anything is persisted.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1, fields: 10 },
}).single('image');

/** Validates the real file type from magic bytes (the client-sent mimetype/extension is not trusted), then stores it. */
export async function storeImageIfPresent(file: Express.Multer.File | undefined): Promise<string | null> {
  if (!file) return null;
  const storage = getStorage();
  if (!storage) {
    throw new AppError(503, 'UPLOADS_DISABLED', 'Image uploads are not configured on this server. You can submit your request without an image.');
  }
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !ALLOWED[detected.mime]) throw badRequest('Only JPEG, PNG or WebP images are allowed', { image: 'Unsupported file type' });
  return storage.put(file.buffer, ALLOWED[detected.mime], detected.mime);
}
