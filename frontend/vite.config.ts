import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const pagesBase = process.env.GITHUB_PAGES === 'true' ? '/PalantirOntologyStudy/' : '/';

export default defineConfig({
  base: pagesBase,
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
