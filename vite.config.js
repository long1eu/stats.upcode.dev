import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// One page per project, plus the index at the root.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        cinderblock: resolve(import.meta.dirname, 'cinderblock/index.html'),
      },
    },
  },
});
