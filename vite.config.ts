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
          description: 'Offline-first command center for learning any skill, with mastery gates, spaced repetition and a prerequisite knowledge graph.',
          theme_color: '#0e1411',
          background_color: '#0e1411',
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
              name: 'Recall queue',
              short_name: 'Recall',
              description: 'Review due cards',
              url: './#/recall',
              icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Curriculum',
              short_name: 'Curriculum',
              description: 'Open the 24-week map',
              url: './#/curriculum',
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
