import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS } from '@/config/solver'
import { makeGen1000 } from '@/data/gen1000'
import nancy from '@/data/nancy-60.instance.json'
import { InstanceSchema } from '@/types/vrp'
import { mockSolve } from './mockRun'
import { RunCancelled } from './types'

const NANCY = InstanceSchema.parse(nancy)
const params = { ...DEFAULT_PARAMS, durationS: 1 }

describe('calcul simulé : jamais de faux résultat', () => {
  it('refuse le PLNE et Clarke-Wright', async () => {
    await expect(mockSolve({ instance: NANCY, algo: 'milp', params }).result).rejects.toThrow(/aucun résultat factice/)
    await expect(mockSolve({ instance: NANCY, algo: 'clarke-wright', params }).result).rejects.toThrow(/aucun résultat factice/)
  })
  it('refuse une autre instance et NANCY-60 modifiée', async () => {
    await expect(mockSolve({ instance: makeGen1000(10), algo: 'sa', params }).result).rejects.toThrow(/uniquement sur NANCY-60/)
    const modified = { ...NANCY, fleet: { ...NANCY.fleet, Q: 90 } }
    await expect(mockSolve({ instance: modified, algo: 'sa', params }).result).rejects.toThrow(/modifiée/)
  })
  it('déroule la convergence puis marque les contraintes non prises en compte', async () => {
    const h = mockSolve({ instance: NANCY, algo: 'sa', params })
    const seen: number[] = []
    h.onProgress((p) => seen.push(p.history.length))
    const r = await h.result
    expect(seen.length).toBeGreaterThan(1)
    expect(r.history.length).toBeLessThanOrEqual(500)
    expect(r.history.at(-1)?.best).toBe(r.cost)
    expect(r.ignoredConstraints.sort()).toEqual(['timeWindows', 'traffic'])
  })
  it('l’annulation rejette sans résultat', async () => {
    const h = mockSolve({ instance: NANCY, algo: 'sa', params: { ...params, durationS: 5 } })
    setTimeout(() => h.cancel(), 300)
    await expect(h.result).rejects.toBeInstanceOf(RunCancelled)
  })
})
