/**
 * Critère P2 : import de 1000 clients sans tâche bloquante > 100 ms sur le fil principal ; erreurs listées
 * ligne par ligne. Mesure par PerformanceObserver('longtask') entre le choix du fichier et l'affichage du rapport.
 * Écrit docs/perf/import-1000.json et une capture du rapport.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

function makeCsv(n: number): string {
  const lines = ['id;nom;lat;lng;demande;debut;fin;service']
  for (let i = 1; i <= n; i++) {
    const lat = (48 + (i % 97) / 100).toFixed(4)
    const lng = (6 + (i % 89) / 100).toFixed(4)
    if (i === 11) lines.push(`${i};Client ${i};abc;${lng};3;08:00;10:00;10`) // latitude illisible → ligne 12
    else if (i === 500) lines.push(`${i};Client ${i};${lat};${lng};-2;08:00;10:00;10`) // demande négative → ligne 501
    else if (i === 999) lines.push(`${i};Client ${i};${lat};${lng};4;11:00;09:00;10`) // a > b → ligne 1000
    else lines.push(`${i};Client ${i};${lat};${lng};${1 + (i % 9)};08:${String(i % 60).padStart(2, '0')};12:00;${5 + (i % 10)}`)
  }
  return lines.join('\n')
}

test('import de 1000 clients : pas de tâche > 100 ms, erreurs ligne par ligne', async ({ page }) => {
  await openApp(page, 'light', 1280)
  await page.evaluate(() => {
    const w = window as unknown as { __long: number[] }
    w.__long = []
    new PerformanceObserver((list) => list.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ type: 'longtask' })
  })
  const t0 = Date.now()
  await page.locator('#import-file').setInputFiles({ name: 'clients-1000.csv', mimeType: 'text/csv', buffer: Buffer.from(makeCsv(1000)) })
  await expect(page.getByText(/1000 lignes lues, 997 clients retenus, 3 erreurs/)).toBeVisible({ timeout: 20_000 })
  const elapsedMs = Date.now() - t0
  await page.waitForTimeout(1500) // laisse passer le recadrage de la carte et le rendu de la table
  const longTasks = await page.evaluate(() => (window as unknown as { __long: number[] }).__long)

  const issues = page.locator('details ol li')
  await expect(issues.filter({ hasText: 'Ligne 12' })).toContainText('latitude')
  await expect(issues.filter({ hasText: 'Ligne 501' })).toContainText('négative')
  await expect(issues.filter({ hasText: 'Ligne 1000' })).toContainText('a > b')
  await expect(page.getByText(/997 clients affichés sur 997/)).toBeVisible()

  mkdirSync('docs/perf', { recursive: true })
  const report = { date: new Date().toISOString(), rows: 1000, elapsedMs, longTasksMs: longTasks.map(Math.round), maxLongTaskMs: Math.round(Math.max(0, ...longTasks)) }
  writeFileSync('docs/perf/import-1000.json', JSON.stringify(report, null, 2) + '\n')
  await page.getByRole('heading', { name: 'Importer un fichier' }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'docs/captures/p2-import-1000-1280.png' })
  await page.getByRole('heading', { name: 'Clients' }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'docs/captures/p2-table-1280.png' })
  expect(report.maxLongTaskMs, `tâches longues : ${report.longTasksMs.join(', ')} ms`).toBeLessThanOrEqual(100)
})
