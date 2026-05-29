import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SF Playground Finder',
        short_name: 'Playgrounds',
        description: 'Find SF playgrounds for toddlers',
        start_url: '/sf-playground-finder/',
        scope: '/sf-playground-finder/',
        display: 'standalone',
        background_color: '#f0f4f7',
        theme_color: '#1a5f7a',
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  base: '/sf-playground-finder/',
})
