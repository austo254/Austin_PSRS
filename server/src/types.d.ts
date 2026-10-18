import type { User } from './db/schema.js';

declare global {
  namespace Express {
    interface Request {
      auth?: { user: User; sessionToken: string; csrfToken: string };
    }
  }
}
export {};
