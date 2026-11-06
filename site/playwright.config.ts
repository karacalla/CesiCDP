/**
 * Rôle : captures d'écran, audit axe et mesures des essais (S1–S3) dans un vrai navigateur.
 * Choix retenu : Chromium avec accélération GPU demandée (ANGLE/D3D11) pour que les mesures d'images/s aient un sens.
 * Alternative écartée : headless par défaut (SwiftShader, rendu logiciel) : mesures pessimistes et non représentatives.
 * Question probable du jury : « vos images/s sont-elles mesurées sur GPU ? » → le moteur WebGL utilisé est consigné avec chaque mesure.
 */
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199',
    launchOptions: { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
