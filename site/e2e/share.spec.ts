/**
 * P4b lot 3 : partage des tournées (ADR-021). Dialogue au clavier (focus piégé, Échap, retour du focus), GPX
 * téléchargé bien formé et nommé proprement, confirmation avant tout service tiers, feuille de route imprimable,
 * axe sans violation dans les deux thèmes.
 */
import { readFileSync } from 'node:fs'
import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers'

async function openTours(page: Page, theme: 'light' | 'dark', width: number): Promise<void> {
  await openApp(page, theme, width)
  await page.getByRole('button', { name: 'Calculer les tournées' }).click()
  await page.getByRole('heading', { name: 'Toutes les tournées' }).waitFor({ timeout: 30_000 })
  await page.waitForTimeout(800)
}

test('dialogue de partage : clavier, GPX, confirmation, impression', async ({ page }) => {
  await openTours(page, 'light', 1280)
  const trigger = page.getByRole('button', { name: 'Partager la tournée du camion 1' }).first()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Partager la tournée du camion 1' })
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'docs/captures/p4b-l3-dialogue-light-1280.png' })

  // focus piégé : 20 tabulations restent dans le dialogue
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  // GPX téléchargé : nom assaini, XML bien formé, 25 arrêts + dépôt aller/retour, mention « simulé »
  await trigger.click()
  const [gpx] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'GPX', exact: true }).click()])
  expect(gpx.suggestedFilename()).toMatch(/^cesicdp-camion-1-\d{4}-\d{2}-\d{2}\.gpx$/)
  const xml = readFileSync((await gpx.path()) ?? '', 'utf8')
  const parsed = await page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, 'application/xml')
    return { errors: doc.getElementsByTagName('parsererror').length, rtept: doc.getElementsByTagName('rtept').length, trkpt: doc.getElementsByTagName('trkpt').length, meta: doc.getElementsByTagName('metadata')[0]?.textContent ?? '' }
  }, xml)
  expect(parsed.errors).toBe(0)
  expect(parsed.rtept).toBe(27)
  expect(parsed.trkpt).toBeGreaterThan(10)
  expect(parsed.meta).toContain('Résultat simulé')
  const [csv] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'CSV', exact: true }).click()])
  expect(csv.suggestedFilename()).toMatch(/^cesicdp-camion-1-.*\.csv$/)

  // service tiers : rien ne s'ouvre sans confirmation explicite
  await dialog.getByRole('button', { name: /^Google Maps 1\/3/ }).click()
  const confirm = dialog.getByRole('alertdialog')
  await expect(confirm).toContainText('seront transmises à Google Maps')
  const link = confirm.getByRole('link', { name: 'Ouvrir Google Maps' })
  await expect(link).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=/)
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  await page.screenshot({ path: 'docs/captures/p4b-l3-confirmation-light-1280.png' })
  await confirm.getByRole('button', { name: 'Annuler' }).click()
  await expect(confirm).toBeHidden()
  await expect(dialog.getByRole('button', { name: /^Waze : / })).toBeVisible()
  await expect(dialog.getByRole('img', { name: /QR code/ })).toBeVisible()

  // impression : seule la feuille de route est imprimée
  await page.emulateMedia({ media: 'print' })
  const sheet = page.locator('.print-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.locator('tbody tr')).toHaveCount(25)
  await expect(sheet).toContainText('Résultat simulé')
  await expect(page.locator('#panneau-bulle')).toBeHidden()
  await page.screenshot({ path: 'docs/captures/p4b-l3-feuille-de-route.png', fullPage: true })
  await page.emulateMedia({ media: 'screen' })
})

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1280, 768]) {
    test(`axe · dialogue de partage · ${theme} @ ${width}px`, async ({ page }) => {
      await openTours(page, theme, width)
      await page.getByRole('button', { name: 'Partager la tournée du camion 1' }).first().click()
      await page.getByRole('dialog').waitFor()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `docs/captures/p4b-l3-dialogue-${theme}-${width}.png` })
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-canvas').analyze()
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
    })
  }
}
