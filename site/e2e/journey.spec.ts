/**
 * Parcours principal (friction minimale) : ouvrir l'application → UN clic « Calculer les tournées » → tournées
 * affichées (tracé à deux états, pins, carte d'info, cartes de tournées). Captures dans les deux thèmes, deux largeurs.
 */
import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1280, 768]) {
    test(`parcours 1 clic · ${theme} @ ${width}px`, async ({ page }) => {
      await openApp(page, theme, width)
      await page.screenshot({ path: `docs/captures/ux-accueil-${theme}-${width}.png` })
      await page.getByRole('button', { name: 'Calculer les tournées' }).click() // le seul clic
      await expect(page.getByRole('heading', { name: 'Toutes les tournées' })).toBeVisible({ timeout: 30_000 })
      await expect(page.getByRole('button', { name: /Afficher le Camion 1 25 arrêts/ }).first()).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('button', { name: /^Arrêt 1 : / })).toBeVisible()
      // carte d'info sur la carte seulement quand elle est large ; sinon le panneau porte la même information
      if (width === 1280) await expect(page.getByRole('button', { name: 'Fermer la fiche' })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      await page.waitForTimeout(2500) // recadrage de la carte
      await page.screenshot({ path: `docs/captures/ux-tournees-${theme}-${width}.png` })
      if (width === 1280) {
        // sélection d'un autre camion depuis le panneau → recadrage, tracé ambre
        await page.getByRole('button', { name: /Afficher le Camion 3 / }).last().click()
        await page.waitForTimeout(2500)
        await page.screenshot({ path: `docs/captures/ux-camion3-${theme}-${width}.png` })
        await page.locator('main').evaluate((m) => m.scrollTo(0, 0))
        await page.locator('main').screenshot({ path: `docs/captures/ux-panneau-${theme}-${width}.png` })
      }
    })
  }
}
