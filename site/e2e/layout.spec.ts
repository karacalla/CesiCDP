/**
 * P4b lot 1 : plein écran + bulle de verre. Aucun défilement de page (ni horizontal ni vertical) à 768, 1280 et
 * 1920 px ; la bulle ne déborde pas de la fenêtre ; replier la bulle rend la carte ; captures avant / après calcul.
 */
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers'

async function noPageScroll(page: Page): Promise<void> {
  const o = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }))
  expect(o.x).toBeLessThanOrEqual(0)
  expect(o.y).toBeLessThanOrEqual(0)
}

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1920, 1280, 768]) {
    test(`plein écran + bulle · ${theme} @ ${width}px`, async ({ page }) => {
      await openApp(page, theme, width)
      await noPageScroll(page)
      const bubble = page.locator('#panneau-bulle')
      const box = await bubble.boundingBox()
      expect(box).not.toBeNull()
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
      }
      await page.screenshot({ path: `docs/captures/p4b-l1-accueil-${theme}-${width}.png` })
      await page.getByRole('button', { name: 'Calculer les tournées' }).click()
      await page.getByRole('heading', { name: 'Toutes les tournées' }).waitFor({ timeout: 30_000 })
      await page.waitForTimeout(2500)
      await noPageScroll(page)
      await page.screenshot({ path: `docs/captures/p4b-l1-tournees-${theme}-${width}.png` })
      await page.getByRole('button', { name: 'Replier le panneau' }).click()
      await expect(bubble).toBeHidden()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `docs/captures/p4b-l1-replie-${theme}-${width}.png` })
      await page.getByRole('button', { name: 'Déplier le panneau' }).click()
      await expect(bubble).toBeVisible()
    })
  }
}
