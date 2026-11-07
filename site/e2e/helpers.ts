/** Ouverture de l'application dans un thème et une largeur donnés, carte chargée. */
import type { Page } from '@playwright/test'

/**
 * `motion` : niveau d'animation forcé (réglage « Animations »). Par défaut « aucune » : les tests de parcours et
 * les captures sont déterministes (pas de vol de 4,5 s) ; e2e/globe.spec.ts teste les animations complètes.
 */
export async function openApp(page: Page, theme: 'light' | 'dark', width: number, motion: 'full' | 'reduced' | 'none' | null = 'none'): Promise<void> {
  await page.setViewportSize({ width, height: 860 })
  await page.addInitScript(([t, m]) => {
    localStorage.setItem('cesicdp.theme', t ?? 'light')
    if (m) localStorage.setItem('cesicdp.motion', m)
  }, [theme, motion] as const)
  await page.goto('/')
  // la carte passe aria-busy="false" au premier état inactif (tuiles et relief chargés)
  await page.locator('section[aria-busy="false"]').first().waitFor({ timeout: 60_000 })
  await page.waitForTimeout(500)
}
