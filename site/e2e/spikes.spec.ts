/**
 * Exécute les essais S1–S3 dans Chromium, écrit les mesures dans docs/spikes/resultats.json
 * et une capture par essai dans docs/captures/. Lancer : npm run spikes
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { test } from '@playwright/test'

const OUT = 'docs/spikes/resultats.json'
const results: Record<string, unknown> = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')) as Record<string, unknown>) : {}

const CASES = [
  { key: 'S1', url: '/spikes/s1.html', shot: 's1-relief-deckgl.png' },
  { key: 'S2-gpu-1000', url: '/spikes/s2.html?n=1000&mode=gpu', shot: 's2-gpu-1000.png' },
  { key: 'S2-gpu-5000', url: '/spikes/s2.html?n=5000&mode=gpu', shot: null },
  { key: 'S2-native-1000', url: '/spikes/s2.html?n=1000&mode=native', shot: 's2-native-1000.png' },
  { key: 'S2-native-5000', url: '/spikes/s2.html?n=5000&mode=native', shot: null },
  { key: 'S2-dom-1000', url: '/spikes/s2.html?n=1000&mode=dom', shot: null },
  { key: 'S2-dom-40', url: '/spikes/s2.html?n=40&mode=dom', shot: null },
  { key: 'S2-dom-1', url: '/spikes/s2.html?n=1&mode=dom', shot: null },
  { key: 'S2-dom-plain-40', url: '/spikes/s2.html?n=40&mode=dom&blur=0', shot: null },
  { key: 'S2-dom-plain-1000', url: '/spikes/s2.html?n=1000&mode=dom&blur=0', shot: null },
  { key: 'S2-overlay-1', url: '/spikes/s2.html?n=1&mode=overlay', shot: null },
  { key: 'S2-overlay-40', url: '/spikes/s2.html?n=40&mode=overlay', shot: null },
  { key: 'S3', url: '/spikes/s3.html', shot: 's3-gantt.png' },
  { key: 'P4-gantt-20x50', url: '/spikes/gantt.html', shot: 'p4-gantt-20x50.png' },
]

test.describe.configure({ mode: 'serial' })

for (const c of CASES) {
  test(c.key, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(c.url)
    const t0 = Date.now()
    try {
      await page.waitForFunction(() => window.__spike !== undefined && 'spike' in window.__spike, null, { timeout: 90_000 })
      results[c.key] = await page.evaluate(() => window.__spike)
    } catch {
      // un essai qui ne rend pas de mesure en 90 s est un résultat en soi (page bloquée)
      results[c.key] = { spike: c.key, blocked: true, waitedS: Math.round((Date.now() - t0) / 1000) }
    }
    if (c.shot) {
      mkdirSync('docs/captures', { recursive: true })
      await page.screenshot({ path: `docs/captures/${c.shot}` })
    }
    mkdirSync('docs/spikes', { recursive: true })
    writeFileSync(OUT, JSON.stringify(results, null, 2) + '\n')
  })
}
