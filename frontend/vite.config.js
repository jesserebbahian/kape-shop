import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export function frontendConfig() {
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Kape – Roast-to-Order Coffee',
          short_name: 'Kape',
          description: 'Browse Philippine coffee and order from weekly roast batches.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#0e5a4a',
          background_color: '#f3f5f1',
          icons: [
            { src: '/icons/kape-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/kape-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/kape-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{html,js,css,png,webp}'],
          globIgnores: ['products/**'],
          navigateFallbackDenylist: [/^\/api(?:\/|-docs)/, /^\/products\/[^/]+\.(?:jpe?g|png|webp)$/i],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => /^\/api\/v1\/products(?:\/\d+)?$/.test(url.pathname),
              handler: 'NetworkFirst',
              method: 'GET',
              options: {
                cacheName: 'kape-public-catalog',
                networkTimeoutSeconds: 4,
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 80, maxAgeSeconds: 86400 }
              }
            },
            {
              urlPattern: ({ request, url, sameOrigin }) => request.destination === 'image' && sameOrigin && url.pathname.startsWith('/products/'),
              handler: 'CacheFirst',
              method: 'GET',
              options: {
                cacheName: 'kape-product-photos',
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 100, maxAgeSeconds: 604800 }
              }
            }
          ]
        }
      })
    ],
    server: { proxy: { '/api/v1': 'http://localhost:3000' } }
  };
}

export default defineConfig(frontendConfig());
