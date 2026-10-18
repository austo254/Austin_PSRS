/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the API runs on :4000; proxying keeps cookies same-origin (no CORS/SameSite issues).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], globals: true },
});
