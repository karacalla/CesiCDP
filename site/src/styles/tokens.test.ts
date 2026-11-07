/**
 * Vérifie automatiquement les paires de contraste promises par le tableau des jetons (CLAUDE.md §4)
 * et l'interdiction des tailles de texte < 12 px dans le code source.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/contrast'

const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8')

function token(name: string): string {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)
  if (!m?.[1]) throw new Error(`Jeton --${name} absent ou non hexadécimal`)
  return m[1]
}

/** [premier plan, fond, seuil minimal, usage] — 4,5 = texte courant AA, 3 = grand texte / éléments graphiques. */
const PAIRS: Array<[string, string, number, string]> = [
  ['muted-text-aa', 'bg', 4.5, 'texte secondaire sur sombre'],
  ['muted-text-aa', 'muted-bg', 4.5, 'texte secondaire sur pastille sombre'],
  ['on-dark', 'bg', 4.5, 'texte principal sur sombre'],
  ['on-dark', 'journey-card', 4.5, 'texte des cartes de tournée'],
  ['muted-text-aa', 'journey-card', 4.5, 'texte secondaire des cartes de tournée'],
  ['on-accent', 'accent', 4.5, 'texte sur le rose'],
  ['accent-ink', 'card', 4.5, 'rose lisible sur blanc'],
  ['accent-ink', 'panel', 4.5, 'rose lisible sur panneau'],
  ['ink', 'panel', 4.5, 'texte principal du panneau'],
  ['ok-ink', 'panel', 4.5, 'à l’heure sur surface du panneau'],
  ['wait-ink', 'panel', 4.5, 'attente sur surface du panneau'],
  ['ink-2', 'panel', 4.5, 'texte secondaire du panneau'],
  ['ink-2', 'card', 4.5, 'texte secondaire des cartes'],
  ['accent', 'bg', 4.5, 'rose sur sombre (thème sombre)'],
  ['ok', 'bg', 4.5, 'statut « à l’heure » sur sombre'],
  ['wait', 'bg', 4.5, 'statut « attente » sur sombre'],
  ['late', 'bg', 4.5, 'statut « retard » sur sombre'],
  ['series-2', 'bg', 4.5, 'seconde série des graphiques'],
  ['accent', 'bg-darker', 3, 'tracé actif sur la carte'],
  ['accent', 'muted-bg', 4.5, 'rose sur surface sombre (thème sombre)'],
  ['late-ink', 'panel', 4.5, 'retard (indigo) sur surface du panneau'],
  ['late-ink', 'card', 4.5, 'retard / erreur sur clair'],
  ['late-ink', 'panel', 4.5, 'retard / erreur sur panneau'],
  ['ok-ink', 'card', 4.5, 'à l’heure sur clair'],
  ['wait-ink', 'card', 4.5, 'attente sur clair'],
  ['late', 'muted-bg', 4.5, 'retard / erreur sur surface sombre'],
  ['ok', 'muted-bg', 4.5, 'à l’heure sur surface sombre'],
  ['wait', 'muted-bg', 4.5, 'attente sur surface sombre'],
]

describe('jetons de couleur : contrastes WCAG 2.1 AA', () => {
  it.each(PAIRS)('%s sur %s ≥ %s (%s)', (fg, bg, min) => {
    expect(contrastRatio(token(fg), token(bg))).toBeGreaterThanOrEqual(min)
  })

  it('confirme les interdits documentés', () => {
    expect(contrastRatio(token('accent'), token('card'))).toBeLessThan(3) // rose en texte sur blanc : interdit (2,66:1)
    expect(contrastRatio(token('muted-text'), token('bg'))).toBeLessThan(4.5) // --muted-text : décor seulement
  })
})

/** Valeur `rgb(R G B / A)` d'un jeton dans un bloc (`:root {` ou `:root[data-theme='dark'] {`). */
function glass(block: string, name: string): { rgb: [number, number, number]; a: number } {
  const start = css.indexOf(block)
  const body = css.slice(start, css.indexOf('}', start))
  const m = new RegExp(String.raw`--${name}:\s*rgb\((\d+) (\d+) (\d+) / ([\d.]+)\)`).exec(body)
  if (!m) throw new Error(`Jeton --${name} absent du bloc ${block}`)
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], a: Number(m[4]) }
}
const hex = (c: number[]): string => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
/** Couleur visible du panneau : liseré puis surface de verre, composés sur un fond donné (alpha « over »). */
function composite(block: string, backdrop: [number, number, number]): string {
  let c = backdrop.map(Number)
  for (const layer of ['glass-rim', 'glass-bg']) {
    const g = glass(block, layer)
    c = c.map((v, i) => (g.rgb[i] ?? 0) * g.a + v * (1 - g.a))
  }
  return hex(c)
}

describe('bulle de verre (ADR-019) : contraste garanti quel que soit le fond de carte', () => {
  const LIGHT = ['ink', 'ink-2', 'late-ink', 'ok-ink', 'wait-ink', 'accent-ink']
  const DARK = ['on-dark', 'muted-text-aa', 'late', 'ok', 'wait', 'accent']
  const cases = [
    ...LIGHT.flatMap((t) => [[':root {', t, 'blanc', [255, 255, 255]], [':root {', t, 'noir', [0, 0, 0]]] as const),
    ...DARK.flatMap((t) => [[":root[data-theme='dark'] {", t, 'blanc', [255, 255, 255]], [":root[data-theme='dark'] {", t, 'noir', [0, 0, 0]]] as const),
  ]
  it.each(cases)('%s --%s sur verre composé sur %s ≥ 4,5', (block, tok, _name, backdrop) => {
    expect(contrastRatio(token(tok), composite(block, [...backdrop]))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('typographie', () => {
  it('aucune taille de texte inférieure à 12 px dans src/', () => {
    const offenders: string[] = []
    const walk = (dir: string): void => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(tsx?|css)$/.test(f) && !f.endsWith('.test.ts')) {
          const src = readFileSync(p, 'utf8')
          if (/text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]|font-size:\s*(?:[0-9]|1[01])(?:\.\d+)?px/.test(src)) offenders.push(p)
        }
      }
    }
    walk(join(__dirname, '..'))
    expect(offenders).toEqual([])
  })
})
