/**
 * Audit axe (WCAG 2.1 A et AA) de la coque, dans les deux thèmes, à 1920, 1280 et 768 px.
 * Le canevas de la carte est exclu : axe ne sait pas lire un fond WebGL ; les textes posés dessus sont
 * contrôlés sur capture (CLAUDE.md §4 : « vérifier le contraste sur une capture réelle »).
 */
import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

const VIEWS = [null, 'Données', 'Contraintes', 'Calcul', 'Tournées calculées'] as const

for (const view of VIEWS) for (const theme of ['light', 'dark'] as const) {
  for (const width of [1920, 1280, 768]) {
    test(`axe · ${view ?? 'Tournées (accueil)'} · ${theme} @ ${width}px`, async ({ page }) => {
      await openApp(page, theme, width)
      if (view === 'Tournées calculées') {
        await page.getByRole('button', { name: 'Calculer les tournées' }).click()
        await page.getByRole('heading', { name: 'Toutes les tournées' }).waitFor({ timeout: 30_000 })
        await page.waitForTimeout(1500)
      } else if (view) await page.getByRole('button', { name: view, exact: true }).click()
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('.maplibregl-canvas')
        .analyze()
      const summary = result.violations.map((v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
      expect(summary).toEqual([])
    })
  }
}
