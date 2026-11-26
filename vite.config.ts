/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // A relative base makes the same build work at a host root (Vercel, Cloudflare
  // Pages) and under a repository subpath (GitHub Pages). The router is hash-based,
  // so no server-side route fallback is required for normal navigation.
  const base = process.env['VITE_BASE'] ?? (mode === 'production' ? './' : '/')

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'SkillMastery — Learning Command Center',
          short_name: 'SkillMastery',
          description: 'Offline-first control centre for a 24-week Dart, Flutter and UI/UX course, with honest estimates, proof-based mastery and spaced recall.',
          theme_color: '#0b0f17',
          background_color: '#0b0f17',
          display: 'standalone',
          orientation: 'any',
          lang: 'en',
          dir: 'ltr',
          categories: ['education', 'productivity'],
          start_url: './',
          scope: './',
          prefer_related_applications: false,
          shortcuts: [
            {
              name: 'Practice',
              short_name: 'Practice',
              description: 'Review due concepts and cards',
              url: './#/practice',
              icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Plan',
              short_name: 'Plan',
              description: 'Open the 24-week plan',
              url: './#/plan',
              icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 900,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  }
})
