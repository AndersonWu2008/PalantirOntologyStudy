import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ontology': path.resolve(__dirname, '../ontology'),
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        rewriteUrls: false,
      },
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
});
