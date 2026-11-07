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
  ['on-accent', 'accent', 4.5, 'texte sur ambre'],
  ['accent-ink', 'card', 4.5, 'ambre lisible sur blanc'],
  ['accent-ink', 'panel', 4.5, 'ambre lisible sur panneau'],
  ['ink', 'panel', 4.5, 'texte principal du panneau'],
  ['ink-2', 'panel', 4.5, 'texte secondaire du panneau'],
  ['ink-2', 'card', 4.5, 'texte secondaire des cartes'],
  ['accent', 'bg', 4.5, 'ambre sur sombre (thème sombre)'],
  ['ok', 'bg', 4.5, 'statut « à l’heure » sur sombre'],
  ['wait', 'bg', 4.5, 'statut « attente » sur sombre'],
  ['late', 'bg', 4.5, 'statut « retard » sur sombre'],
  ['series-2', 'bg', 4.5, 'seconde série des graphiques'],
  ['accent', 'bg-darker', 3, 'tracé actif sur la carte'],
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
    expect(contrastRatio(token('accent'), token('card'))).toBeLessThan(3) // ambre en texte sur blanc : interdit
    expect(contrastRatio(token('muted-text'), token('bg'))).toBeLessThan(4.5) // --muted-text : décor seulement
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
