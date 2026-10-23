import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'packages/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'packages/renderer/src'),
      '@main': path.resolve(__dirname, 'packages/main'),
      '@preload': path.resolve(__dirname, 'packages/preload'),
      '@boosts': path.resolve(__dirname, 'packages/boosts-engine'),
      '@adblock': path.resolve(__dirname, 'packages/ad-blocker'),
      '@importer': path.resolve(__dirname, 'packages/data-importer'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
