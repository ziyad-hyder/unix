import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

function getBuildId() {
  if (process.env.CF_PAGES_COMMIT_SHA) {
    return process.env.CF_PAGES_COMMIT_SHA.slice(0, 8);
  }
  if (process.env.VITE_BUILD_ID) {
    return process.env.VITE_BUILD_ID;
  }
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'local-' + Date.now().toString(36);
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const buildId = getBuildId();
  const apiUrl = env.VITE_API_URL || env.VITE_API_BASE_URL || '';
  const cleanApiUrl = apiUrl ? apiUrl.replace(/\/+$/, '') : '';
  const apiPattern = cleanApiUrl
    ? new RegExp(`^${cleanApiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/.*)?$|.*/api/.*`)
    : /.*\/api\/.*/;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'UniX',
          short_name: 'UniX',
          description: 'Campus Resource Sharing & Marketplace for KITSW students',
          start_url: '/',
          display: 'standalone',
          theme_color: '#173541',
          background_color: '#FAFAF8',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          cacheId: `unix-${buildId}`,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: apiPattern,
              handler: 'NetworkFirst',
              options: {
                cacheName: `unix-api-${buildId}`,
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 300,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

