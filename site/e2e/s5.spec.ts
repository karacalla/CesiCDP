/**
 * Essai S5 (suite) : l'animation est-elle composée hors du fil principal ? Une capture d'écran attend le fil
 * principal (essai fait : inexploitable) ; on lit donc la trace Chromium (`blink.animations`), où le moteur
 * indique pour chaque animation si la composition a échoué et pourquoi (`compositeFailed`, propriétés en cause).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { chromium, expect, test } from '@playwright/test'

const OUT = 'docs/spikes/resultats.json'

for (const mode of ['offset', 'waapi'] as const) {
  test(`S5 ${mode}`, async ({ page, browser }) => {
    expect(browser.browserType()).toBe(chromium)
    await page.setViewportSize({ width: 1280, height: 800 })
    await browser.startTracing(page, { categories: ['blink.animations', 'devtools.timeline', 'disabled-by-default-devtools.timeline'] })
    await page.goto(`/spikes/s5.html?mode=${mode}`)
    await page.waitForFunction(() => window.__spike !== undefined, null, { timeout: 30_000 })
    const trace = JSON.parse((await browser.stopTracing()).toString('utf8')) as { traceEvents: Array<{ name: string; args?: { data?: Record<string, unknown> } }> }
    const anims = trace.traceEvents.filter((e) => e.name === 'Animation' && e.args?.data && 'compositeFailed' in e.args.data).map((e) => e.args?.data)
    const metrics = await page.evaluate(() => window.__spike)
    mkdirSync('docs/spikes', { recursive: true })
    const all = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')) as Record<string, unknown>) : {}
    all[`S5-${mode}`] = { ...(metrics as object), compositor: anims.length ? anims : 'aucun évènement de composition dans la trace' }
    writeFileSync(OUT, JSON.stringify(all, null, 2) + '\n')
  })
}
