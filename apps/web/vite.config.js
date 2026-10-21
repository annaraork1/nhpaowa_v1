import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.png',
        'favicon-16.png',
        'favicon-32.png',
        'favicon-192.png',
        'favicon-512.png',
        'apple-touch-icon.png',
        'nhpaowa-logo.png',
      ],
      manifest: {
        name: 'NHPAOWA',
        short_name: 'NHPAOWA',
        description:
          'New Haven Peenya Apartment Owners Welfare Association — flats, NOC, inventory, and operations.',
        theme_color: '#8E248D',
        background_color: '#f8f5f9',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: '/favicon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/favicon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/favicon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nhpaowa-uploads',
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24,
              },
              networkTimeoutSeconds: 8,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/auth': 'http://localhost:4000',
      '/api/bus': 'http://localhost:4002',
      '/api': 'http://localhost:4001',
      '/uploads': 'http://localhost:4001',
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
});
