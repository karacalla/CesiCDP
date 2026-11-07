/** Ouverture de l'application dans un thème et une largeur donnés, carte chargée. */
import type { Page } from '@playwright/test'

export async function openApp(page: Page, theme: 'light' | 'dark', width: number): Promise<void> {
  await page.setViewportSize({ width, height: 860 })
  await page.addInitScript((t) => localStorage.setItem('cesicdp.theme', t), theme)
  await page.goto('/')
  // la carte passe aria-busy="false" au premier état inactif (tuiles et relief chargés)
  await page.locator('section[aria-busy="false"]').first().waitFor({ timeout: 60_000 })
  await page.waitForTimeout(500)
}
