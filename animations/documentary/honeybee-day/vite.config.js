import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 6000 },
  server: { port: 5230, strictPort: true, host: '127.0.0.1' },
});
