/**
 * Rôle : captures d'écran, audit axe et mesures des essais (S1–S3) dans un vrai navigateur.
 * Choix retenu : Chromium avec accélération GPU demandée (ANGLE/D3D11) pour que les mesures d'images/s aient un sens.
 * Alternative écartée : headless par défaut (SwiftShader, rendu logiciel) : mesures pessimistes et non représentatives.
 * Question probable du jury : « vos images/s sont-elles mesurées sur GPU ? » → le moteur WebGL utilisé est consigné avec chaque mesure.
 */
import { defineConfig, type PlaywrightTestConfig } from '@playwright/test'

/** prod = true : tests contre le build de production (mesures de performance), sinon serveur de dev. */
export function makeConfig(prod: boolean): PlaywrightTestConfig {
  const port = prod ? 5299 : 5199
  return defineConfig({
    testDir: './e2e',
    timeout: 120_000,
    fullyParallel: false,
    workers: 1,
    reporter: [['list']],
    use: {
      baseURL: `http://localhost:${port}`,
      launchOptions: { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] },
    },
    webServer: {
      command: prod ? `npx vite build && npx vite preview --port ${port} --strictPort` : `npx vite --port ${port} --strictPort`,
      url: `http://localhost:${port}`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  })
}

export default makeConfig(process.env.PW_PROD === '1')
