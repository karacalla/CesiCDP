/**
 * Captures d'écran à deux largeurs (CLAUDE.md §10), dans les deux thèmes, et contrôle de l'absence de défilement
 * horizontal. Écrit docs/captures/<phase>-<vue>-<thème>-<largeur>.png. Lancer : SHOTS_PHASE=p1 npm run shots
 */
import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

const PHASE = process.env.SHOTS_PHASE ?? 'ux'
const WIDTHS = [1280, 768] as const
const THEMES = ['light', 'dark'] as const
/** Vue → libellé du bouton de l'îlot de navigation. */
const VIEWS: Array<{ name: string; nav: string | null }> = [
  { name: 'donnees', nav: null },
  { name: 'contraintes', nav: 'Contraintes' },
  { name: 'calcul', nav: 'Calcul' },
  { name: 'tournees-accueil', nav: 'Tournées' },
]


for (const v of VIEWS) {
  for (const theme of THEMES) {
    for (const w of WIDTHS) {
      test(`${v.name} · ${theme} @ ${w}px`, async ({ page }) => {
        await openApp(page, theme, w)
        if (v.nav) await page.getByRole('button', { name: v.nav, exact: true }).click()
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, 'défilement horizontal').toBeLessThanOrEqual(0)
        await page.screenshot({ path: `docs/captures/${PHASE}-${v.name}-${theme}-${w}.png` })
      })
    }
  }
}

test('relief · vue inclinée @ 1280px', async ({ page }) => {
  await openApp(page, 'dark', 1280)
  const canvas = page.locator('canvas.maplibregl-canvas')
  await canvas.focus()
  // chaque touche lance une animation de 300 ms : on attend entre deux appuis
  const press = async (key: string, n: number): Promise<void> => {
    for (let i = 0; i < n; i++) {
      await page.keyboard.press(key)
      await page.waitForTimeout(450)
    }
  }
  await press('Equal', 2)
  await press('Shift+ArrowUp', 4)
  await press('Shift+ArrowLeft', 3)
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `docs/captures/${PHASE}-relief-dark-1280.png` })
})
