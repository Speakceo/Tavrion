import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseTarget =
    env.SUPABASE_URL ||
    (env.VITE_SUPABASE_URL?.startsWith('http') && !env.VITE_SUPABASE_URL.includes('/api/sb')
      ? env.VITE_SUPABASE_URL
      : '');

  if (!supabaseTarget) {
    console.warn(
      '[vite] SUPABASE_URL (or absolute VITE_SUPABASE_URL) is required to proxy /api/sb → Supabase.',
    );
  }

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    resolve: {
      alias: {
        'scorm-again/scorm12': path.resolve(__dirname, 'node_modules/scorm-again/dist/esm/scorm12.js'),
        'scorm-again/scorm2004': path.resolve(__dirname, 'node_modules/scorm-again/dist/esm/scorm2004.js'),
      },
    },
    server: {
      proxy: supabaseTarget
        ? {
            '/api/sb': {
              target: supabaseTarget.replace(/\/$/, ''),
              changeOrigin: true,
              secure: true,
              ws: true,
              rewrite: (p) => p.replace(/^\/api\/sb/, ''),
            },
          }
        : undefined,
    },
    preview: {
      proxy: supabaseTarget
        ? {
            '/api/sb': {
              target: supabaseTarget.replace(/\/$/, ''),
              changeOrigin: true,
              secure: true,
              ws: true,
              rewrite: (p) => p.replace(/^\/api\/sb/, ''),
            },
          }
        : undefined,
    },
  };
});
