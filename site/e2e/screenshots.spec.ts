/**
 * Captures d'écran des vues à deux largeurs (CLAUDE.md §10) et contrôle de l'absence de défilement horizontal.
 * Les captures sont écrites dans docs/captures/<phase>-<vue>-<largeur>.png. Lancer : npm run shots
 */
import { expect, test } from '@playwright/test'

const PHASE = process.env.SHOTS_PHASE ?? 'p0'
const WIDTHS = [1280, 768] as const
const VIEWS: Array<{ name: string; path: string }> = [{ name: 'accueil', path: '/' }]

for (const v of VIEWS) {
  for (const w of WIDTHS) {
    test(`${v.name} @ ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 860 })
      await page.goto(v.path)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, 'défilement horizontal').toBeLessThanOrEqual(0)
      await page.screenshot({ path: `docs/captures/${PHASE}-${v.name}-${w}.png` })
    })
  }
}
