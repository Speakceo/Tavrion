import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      'scorm-again/scorm12': path.resolve(__dirname, 'node_modules/scorm-again/dist/esm/scorm12.js'),
      'scorm-again/scorm2004': path.resolve(__dirname, 'node_modules/scorm-again/dist/esm/scorm2004.js'),
    }
  }
});
