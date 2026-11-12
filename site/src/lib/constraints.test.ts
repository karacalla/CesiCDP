import { describe, expect, it } from 'vitest'
import { makeGen1000 } from '@/data/gen1000'
import { activeConstraints, ignoredBy } from './constraints'
import { fifoViolations, isTrafficActive } from './traffic'

describe('trafic : propriété FIFO (modèle temps × coefficient de départ)', () => {
  const slots = [
    { from: 0, to: 450, factor: 1 },
    { from: 450, to: 570, factor: 1.6 },
    { from: 570, to: 990, factor: 1.15 },
    { from: 990, to: 1440, factor: 1.45 },
  ]
  it('détecte la baisse 1,6 → 1,15 à 09:30 et chiffre l’exemple', () => {
    const v = fifoViolations(slots, 30)
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ at: 570, before: 1.6, after: 1.15 })
    expect(v[0]!.arrivalIfAt).toBeLessThan(v[0]!.arrivalIfJustBefore) // partir plus tard → arriver plus tôt
  })
  it('aucune alerte si les coefficients ne baissent jamais', () => {
    expect(fifoViolations([{ from: 0, to: 600, factor: 1 }, { from: 600, to: 1440, factor: 1.2 }], 30)).toEqual([])
  })
  it('trafic inactif si tous les coefficients valent 1', () => {
    expect(isTrafficActive([{ from: 0, to: 1440, factor: 1 }])).toBe(false)
  })
})

describe('contraintes non prises en compte (critère P3)', () => {
  const inst = makeGen1000(20)
  it('le recuit traite les fenêtres mais ignore le trafic actif ; le PLNE traite les deux', () => {
    expect(activeConstraints(inst)).toEqual(['timeWindows', 'traffic'])
    expect(ignoredBy('sa', inst)).toEqual(['traffic'])
    expect(ignoredBy('milp', inst)).toEqual([])
  })
  it('une contrainte désactivée n’est jamais signalée', () => {
    const off = { ...inst, options: { ...inst.options, timeWindows: 'off' as const }, traffic: { slots: [{ from: 0, to: 1440, factor: 1 }] } }
    expect(ignoredBy('sa', off)).toEqual([])
  })
})
