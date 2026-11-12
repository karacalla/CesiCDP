/**
 * Critère P3 : un algorithme qui ne gère pas une contrainte activée affiche « non pris en compte » et ne produit
 * aucun faux résultat ; convergence en direct ; annulation.
 */
import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

test('calcul simulé : non pris en compte, convergence en direct, annulation, PLNE refusé', async ({ page }) => {
  await openApp(page, 'light', 1280)
  await page.getByRole('button', { name: 'Calcul', exact: true }).click()
  // le recuit (niveau A) traite les fenêtres mais pas le trafic, actif sur NANCY-60
  await expect(page.getByText('Contraintes activées non prises en compte')).toBeVisible()
  await expect(page.getByRole('radio', { name: /Recuit simulé.*Fenêtres : pris en compte Trafic : non pris en compte/ })).toBeVisible()
  await expect(page.getByText(/^Trafic : non pris en compte : cet algorithme ne les traite pas/)).toBeVisible()

  await page.getByRole('spinbutton', { name: 'Durée (s)' }).fill('6')
  await page.getByRole('button', { name: 'Lancer le calcul' }).click()
  await expect(page.getByText(/Calcul en cours/)).toBeVisible()
  await page.waitForTimeout(2500)
  const convergence = page.locator('section', { has: page.getByRole('heading', { name: 'Convergence' }) })
  await convergence.screenshot({ path: 'docs/captures/p3-convergence-en-cours-1280.png' })
  // fin du calcul : l'application bascule d'elle-même sur les tournées (aucun clic de plus)
  await expect(page.getByRole('heading', { name: 'Toutes les tournées' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Statuts indicatifs : fenêtres non prises en compte par l’algorithme.')).toBeVisible()
  await page.getByRole('button', { name: 'Calcul', exact: true }).click()
  await expect(page.getByText(/Contraintes activées non prises en compte : Fenêtres, Trafic\./)).toBeVisible()
  await convergence.screenshot({ path: 'docs/captures/p3-calcul-termine-1280.png' })

  // annulation : aucun résultat retenu
  await page.getByRole('button', { name: 'Lancer le calcul' }).click()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Annuler' }).click()
  await expect(page.getByText('Calcul annulé : aucun résultat retenu.')).toBeVisible()
  await expect(page.getByText(/Coût final/)).toHaveCount(0)

  // PLNE : refus explicite en mode simulé (aucune solution exacte factice)
  await page.getByRole('radio', { name: /PLNE/ }).check()
  await expect(page.getByText('Contraintes activées non prises en compte')).toHaveCount(0)
  await page.getByRole('button', { name: 'Lancer le calcul' }).click()
  await expect(page.getByText(/aucun résultat factice/)).toBeVisible()
})

test('contraintes : éditeur de trafic, courbe et alerte FIFO', async ({ page }) => {
  await openApp(page, 'dark', 1280)
  await page.getByRole('button', { name: 'Contraintes' }).click()
  await expect(page.getByRole('alert')).toContainText('À 09:30, le coefficient passe de 1,6 à 1,15')
  const traffic = page.locator('section', { has: page.getByRole('heading', { name: 'Trafic par tranche horaire' }) })
  await traffic.screenshot({ path: 'docs/captures/p3-trafic-fifo-dark-1280.png' })
  // la courbe réagit : tranche 2 abaissée à 1,15 → coefficients croissants → alerte levée
  const f3 = page.getByRole('textbox', { name: 'Coefficient — tranche 2' })
  await f3.fill('1.15')
  await f3.press('Enter')
  await expect(page.getByText(/Propriété FIFO respectée/)).toBeVisible()
})
