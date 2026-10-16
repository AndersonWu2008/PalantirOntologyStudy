import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const pages = process.env.GITHUB_PAGES === 'true';
const pagesBase = pages ? '/PalantirOntologyStudy/' : '/';

export default defineConfig({
  base: pagesBase,
  define: {
    'import.meta.env.VITE_STATIC_DATA': JSON.stringify(pages ? 'true' : 'false'),
  },
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
