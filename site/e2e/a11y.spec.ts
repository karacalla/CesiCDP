/**
 * Audit axe (WCAG 2.1 A et AA) de la coque, dans les deux thèmes et aux deux largeurs.
 * Le canevas de la carte est exclu : axe ne sait pas lire un fond WebGL ; les textes posés dessus sont
 * contrôlés sur capture (CLAUDE.md §4 : « vérifier le contraste sur une capture réelle »).
 */
import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

const VIEWS = [null, 'Contraintes', 'Calcul'] as const

for (const view of VIEWS) for (const theme of ['light', 'dark'] as const) {
  for (const width of [1280, 768]) {
    test(`axe · ${view ?? 'Données'} · ${theme} @ ${width}px`, async ({ page }) => {
      await openApp(page, theme, width)
      if (view) await page.getByRole('button', { name: view }).click()
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('.maplibregl-canvas')
        .analyze()
      const summary = result.violations.map((v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
      expect(summary).toEqual([])
    })
  }
}
