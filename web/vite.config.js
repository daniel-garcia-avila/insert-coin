import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH permite publicar la app en una subcarpeta (GitHub Pages: /insert-coin/)
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 900 },
});
