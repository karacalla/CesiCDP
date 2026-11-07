/**
 * P4b lot 2 : globe d'ouverture et vol vers les tournées (ADR-020).
 * Critères : ≥ 30 images/s pendant la rotation ; carte au repos (0 rendu) après la pause ; aucune requête hors
 * tuiles ; captures du globe, du vol (3 instants) et de l'arrivée ; « Passer l'animation » ; reduced-motion ;
 * retour au globe quand les tournées sont effacées. Mesures écrites dans docs/perf/globe.json.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers'

const OUT = 'docs/perf/globe.json'
const TILE_HOSTS = ['tiles.openfreemap.org', 'tiles.maps.eox.at', 'elevation-tiles-prod.s3.amazonaws.com']

function save(key: string, value: unknown): void {
  mkdirSync('docs/perf', { recursive: true })
  const all = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')) as Record<string, unknown>) : {}
  all[key] = { date: new Date().toISOString(), ...(value as object) }
  writeFileSync(OUT, JSON.stringify(all, null, 2) + '\n')
}

/** Rendus de la carte et images du navigateur pendant `ms`. */
async function rates(page: Page, ms: number): Promise<{ mapRendersPerS: number; browserFps: number; longTasks: number[] }> {
  return page.evaluate(async (dur) => {
    const map = (window as unknown as { cdpMapForTests: { on: (e: string, f: () => void) => void; off: (e: string, f: () => void) => void } }).cdpMapForTests
    let renders = 0
    let frames = 0
    const long: number[] = []
    const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push(Math.round(e.duration))))
    po.observe({ type: 'longtask' })
    const onRender = () => void renders++
    map.on('render', onRender)
    const t0 = performance.now()
    await new Promise<void>((res) => {
      const f = (now: number) => {
        frames++
        if (now - t0 < dur) requestAnimationFrame(f)
        else res()
      }
      requestAnimationFrame(f)
    })
    map.off('render', onRender)
    po.disconnect()
    return { mapRendersPerS: Math.round((renders / dur) * 10000) / 10, browserFps: Math.round((frames / dur) * 10000) / 10, longTasks: long }
  }, ms)
}

test('globe : rotation ≥ 30 images/s, repos à la pause, vol vers les tournées, aucune requête hors tuiles', async ({ page }) => {
  const foreign: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.hostname !== 'localhost' && u.protocol !== 'data:' && u.protocol !== 'blob:' && !TILE_HOSTS.includes(u.hostname)) foreign.push(u.hostname)
  })
  await openApp(page, 'dark', 1280, 'full')
  await expect(page.getByText('Réseau de dépôts simulé (démonstration)')).toBeVisible()
  await page.waitForTimeout(1500)
  const rotating = await rates(page, 3000)
  await page.screenshot({ path: 'docs/captures/p4b-l2-globe-dark-1280.png' })

  await page.getByRole('button', { name: 'Mettre en pause la rotation du globe' }).click()
  await page.waitForTimeout(1500) // tuiles éventuelles en cours de chargement
  const paused = await rates(page, 2000)
  await page.getByRole('button', { name: 'Reprendre la rotation du globe' }).click()

  await page.getByRole('button', { name: 'Calculer les tournées' }).click()
  const skip = page.getByRole('button', { name: 'Passer l’animation' })
  await expect(skip).toBeVisible({ timeout: 30_000 })
  const flightRates = rates(page, 4000)
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'docs/captures/p4b-l2-vol-1.png' })
  await page.waitForTimeout(1300)
  await page.screenshot({ path: 'docs/captures/p4b-l2-vol-2.png' })
  await page.waitForTimeout(1300)
  await page.screenshot({ path: 'docs/captures/p4b-l2-vol-3.png' })
  const flying = await flightRates
  await expect(page.getByText(/^Tournées affichées : 4 camions\.$/)).toBeAttached({ timeout: 10_000 })
  await expect(skip).toBeHidden()
  await page.waitForTimeout(2000) // inclinaison et cap de la vue Tournées
  await page.screenshot({ path: 'docs/captures/p4b-l2-arrivee-dark-1280.png' })
  await page.waitForTimeout(4000) // fin du chargement des tuiles du relief
  const settled = await rates(page, 2000)

  save('globe-1280-dark', { rotating, paused, flying, settled, foreignHosts: [...new Set(foreign)] })
  expect(rotating.browserFps).toBeGreaterThanOrEqual(30)
  expect(rotating.mapRendersPerS).toBeGreaterThanOrEqual(25) // rotation plafonnée à 30 rendus/s
  expect(paused.mapRendersPerS).toBeLessThanOrEqual(1) // carte au repos : processeur libre
  expect(flying.browserFps).toBeGreaterThanOrEqual(30)
  expect([...new Set(foreign)]).toEqual([])
})

test('vol : « Passer l’animation » termine immédiatement ; retour au globe quand les tournées sont effacées', async ({ page }) => {
  await openApp(page, 'light', 1280, 'full')
  await page.getByRole('button', { name: 'Calculer les tournées' }).click()
  await page.getByRole('button', { name: 'Passer l’animation' }).click({ timeout: 30_000 })
  await expect(page.getByText(/^Tournées affichées/)).toBeAttached({ timeout: 1500 })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: 'docs/captures/p4b-l2-passer-light-1280.png' })
  // changer d'instance efface les tournées → retour au globe (≤ 3 s)
  await page.getByRole('button', { name: 'Données', exact: true }).click()
  await page.getByLabel('Instance de travail').selectOption('GEN-1000')
  await expect(page.getByText('Réseau de dépôts simulé (démonstration)')).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(3200)
  await page.screenshot({ path: 'docs/captures/p4b-l2-retour-light-1280.png' })
})

test('prefers-reduced-motion : globe fixe, saut direct sans vol', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openApp(page, 'dark', 1280, null)
  await expect(page.getByRole('button', { name: 'Mettre en pause la rotation du globe' })).toHaveCount(0)
  await page.waitForTimeout(1500)
  const still = await rates(page, 2000)
  await page.getByRole('button', { name: 'Calculer les tournées' }).click()
  await expect(page.getByText(/^Tournées affichées/)).toBeAttached({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Passer l’animation' })).toHaveCount(0)
  save('globe-reduced-motion', { still })
  expect(still.mapRendersPerS).toBeLessThanOrEqual(1)
})

for (const width of [768, 1920]) {
  test(`globe @ ${width}px : cadré dans la zone visible`, async ({ page }) => {
    await openApp(page, 'dark', width, 'reduced')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `docs/captures/p4b-l2-globe-dark-${width}.png` })
  })
}
