/**
 * Rôle : configuration Vite (app), Vitest (tests unitaires) et alias `@/`.
 * Choix retenu : un seul fichier pour build et tests, les pages d'essai `spikes/` ne sont servies qu'en dev.
 * Alternative écartée : config Vitest séparée (deux sources de vérité pour les alias).
 * Question probable du jury : « pourquoi les essais ne sont-ils pas dans le build ? » → ce sont des mesures, pas des fonctionnalités.
 */
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // maplibre-gl et deck.gl dépassent 1 Mo chacun ; ils sont isolés dans leurs propres morceaux
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
