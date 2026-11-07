/**
 * P4b lot 4 : camion du panneau (ADR-022). Pendant l'animation : aucune tâche longue > 50 ms, aucun décalage de
 * mise en page, clics non gênés ; la baie dit « Camion N · en tournée » ; captures pendant la sortie et l'entrée.
 * Mesures écrites dans docs/perf/cameo.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers'

async function watch(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { perfProbe: { long: number[]; shift: number } }
    w.perfProbe = { long: [], shift: 0 }
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.perfProbe.long.push(Math.round(e.duration)))).observe({ type: 'longtask' })
    new PerformanceObserver((l) =>
      l.getEntries().forEach((e) => {
        const s = e as unknown as { value: number; hadRecentInput: boolean }
        if (!s.hadRecentInput) w.perfProbe.shift += s.value
      }),
    ).observe({ type: 'layout-shift' })
  })
}
const read = (page: Page) => page.evaluate(() => (window as unknown as { perfProbe: { long: number[]; shift: number } }).perfProbe)

for (const width of [1280, 768]) {
  test(`camion du panneau · entrée, rejouer, sortie et retour @ ${width}px`, async ({ page }) => {
    await openApp(page, 'light', width, 'full')
    await page.getByRole('button', { name: 'Calculer les tournées' }).click()
    await page.getByRole('button', { name: 'Passer l’animation' }).click({ timeout: 30_000 })
    // T4 : entrée depuis le coin (2,7 s)
    await page.waitForTimeout(1100)
    await page.screenshot({ path: `docs/captures/p4b-l4-entree-${width}.png` })
    await page.waitForTimeout(2500)
    await expect(page.getByText('Camion 1 au dépôt.')).toBeAttached()

    // « Rejouer l'animation » (réglages) : sortie, absence de 20 s, retour
    await page.getByRole('button', { name: 'Réglages d’affichage' }).click()
    await page.getByRole('button', { name: 'Rejouer l’animation du camion' }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600) // au-delà de la fenêtre « interaction récente » des décalages de mise en page
    await watch(page)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `docs/captures/p4b-l4-sortie-${width}.png` })
    await page.waitForTimeout(1800)
    const exit = await read(page)
    await expect(page.getByText('Camion 1 · en tournée')).toBeVisible()
    await expect(page.getByText(/^retour prévu \d\d:\d\d$/)).toBeVisible()
    await page.screenshot({ path: `docs/captures/p4b-l4-baie-vide-${width}.png` })
    await page.waitForTimeout(20_000 - 2500 + 300)
    await watch(page)
    await page.waitForTimeout(1300)
    await page.screenshot({ path: `docs/captures/p4b-l4-retour-${width}.png` })
    const enter = await read(page)
    // un clic pendant l'animation, sous le trajet (coin supérieur droit du panneau) : il doit aboutir.
    // Hors des fenêtres de mesure : le changement de thème redessine toute l'application (tâche propre au clic).
    await page.getByRole('button', { name: 'Passer au thème sombre' }).click()
    await expect(page.getByRole('button', { name: 'Passer au thème clair' })).toBeVisible()
    await page.waitForTimeout(1800)
    await expect(page.getByText('Camion 1 au dépôt.')).toBeAttached()

    // hors de l'écran (bas du panneau) : aucune animation, l'état change sans mouvement
    await page.getByRole('heading', { name: /^Arrêts du camion/ }).scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: /Afficher le Camion 2 / }).last().click()
    const flying = await page.locator('body > div[aria-hidden]:not([hidden]) svg path').count()
    expect(flying).toBe(0)

    mkdirSync('docs/perf', { recursive: true })
    writeFileSync(`docs/perf/cameo-${width}.json`, JSON.stringify({ date: new Date().toISOString(), width, exit, enter }, null, 2) + '\n')
    expect(Math.max(0, ...exit.long, ...enter.long)).toBeLessThanOrEqual(50)
    expect(exit.shift + enter.shift).toBe(0)
  })
}
