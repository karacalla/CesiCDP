import { describe, expect, it } from 'vitest'
import { makeGen1000 } from '@/data/gen1000'
import { fromSolverResult } from './adapters'

const inst = { ...makeGen1000(5), meta: { source: 'vrplib' as const, coordinates: 'planar' as const, bks: 100, bksObjective: 'distance EUC_2D' } }

describe('adaptateur solveur → contrat', () => {
  it('traduit la sortie actuelle de resoudre() sans inventer d’horaires', () => {
    const r = fromSolverResult(
      { cout: 110, cout_initial: 130, valide: true, message: 'ok', iterations: 5000, routes: [[1, 2], [3, 4, 5]], historique: [[0, 130, 130, 4.2], [0.5, 120, 118, 3.1]] },
      inst,
    )
    expect(r.routes).toHaveLength(2)
    expect(r.routes[0]?.stops[0]).toEqual({ customerId: 1, arrival: null, wait: null, departure: null, late: null })
    expect(r.gap).toBeCloseTo(10)
    expect(r.objective).toBe('distance EUC_2D')
    expect(r.history[1]).toEqual({ t: 0.5, cost: 120, best: 118, temp: 3.1 })
  })

  it('rejette une réponse incomplète', () => {
    expect(() => fromSolverResult({ cout: 1 }, inst)).toThrow()
  })

  it('traduit les contraintes ignorées', () => {
    const r = fromSolverResult({ cout: 1, cout_initial: 1, valide: true, routes: [], contraintes_ignorees: ['fenetres'] }, inst)
    expect(r.ignoredConstraints).toEqual(['timeWindows'])
  })
})
