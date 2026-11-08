/**
 * Essai S6 — camion du panneau physique (ADR-025) sur le rendu réel : séquence d'images pendant un changement de
 * camion (sortie en marche avant, puis retour en marche arrière), trace Chromium (`blink.animations` : composition
 * de chaque animation), tâches longues et décalages de mise en page. Écrit docs/spikes/resultats.json (S6-*) et
 * docs/captures/s6-*.png.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

const OUT = 'docs/spikes/resultats.json'

test('S6 · camion physique : séquence, composition, performance', async ({ page, browser }) => {
  await openApp(page, 'light', 1280, 'full')
  await page.getByRole('button', { name: 'Calculer les tournées' }).click()
  await page.getByRole('button', { name: 'Passer l’animation' }).click({ timeout: 30_000 })
  await page.waitForTimeout(6000) // entrée initiale (T4) terminée
  await page.evaluate(() => {
    const w = window as unknown as { perfProbe: { long: number[]; shift: number } }
    w.perfProbe = { long: [], shift: 0 }
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.perfProbe.long.push(Math.round(e.duration)))).observe({ type: 'longtask' })
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { const s = e as unknown as { value: number; hadRecentInput: boolean }; if (!s.hadRecentInput) w.perfProbe.shift += s.value })).observe({ type: 'layout-shift' })
  })
  await browser.startTracing(page, { categories: ['blink.animations', 'devtools.timeline'] })
  await page.getByRole('button', { name: 'Réglages d’affichage' }).click()
  await page.getByRole('button', { name: 'Rejouer l’animation du camion' }).click() // sortie, 20 s d'absence, retour
  await page.mouse.move(5, 5)
  const shots: string[] = []
  const shoot = async (label: string, list: number[]) => {
    const t0 = Date.now()
    for (const at of list) {
      await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)))
      const name = `docs/captures/s6-${label}-${String(at).padStart(4, '0')}ms.png`
      await page.screenshot({ path: name })
      shots.push(name)
    }
  }
  await shoot('sortie', [150, 600, 1000, 1400, 1800, 2200, 2600])
  const layer = page.locator('body > div[aria-hidden].fixed')
  await expect(layer).toBeHidden({ timeout: 10_000 }) // sortie terminée
  await expect(layer).toBeVisible({ timeout: 30_000 }) // retour commencé (après 20 s d'absence)
  await shoot('retour', [200, 800, 1400, 2000, 2600, 3200, 3800])
  await page.waitForTimeout(2500)
  const trace = JSON.parse((await browser.stopTracing()).toString('utf8')) as { traceEvents: Array<{ name: string; args?: { data?: Record<string, unknown> } }> }
  const failed = trace.traceEvents.filter((e) => e.name === 'Animation' && e.args?.data && 'compositeFailed' in e.args.data).map((e) => e.args?.data)
  const perf = await page.evaluate(() => (window as unknown as { perfProbe: { long: number[]; shift: number } }).perfProbe)
  const parts = await page.evaluate(() => document.querySelectorAll('[data-part], [data-shade]').length)
  mkdirSync('docs/spikes', { recursive: true })
  const all = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')) as Record<string, unknown>) : {}
  all['S6-camion-physique'] = { date: new Date().toISOString(), shots, compositeFailed: failed, longTasks: perf.long, layoutShift: perf.shift, animatedParts: parts }
  writeFileSync(OUT, JSON.stringify(all, null, 2) + '\n')
  // les mesures de performance sont celles de e2e/cameo.spec.ts (sans captures pendant la fenêtre de mesure)
  expect(failed).toEqual([])
})
