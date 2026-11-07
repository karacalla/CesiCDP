/**
 * Rôle : implémentation SIMULÉE de l'API (aucun réseau). Données déterministes : NANCY-60 (fichiers générés une
 *   fois par scripts/make-nancy60.ts) et GEN-1000 (graine fixe).
 * Les fichiers lourds (tracés routiers) sont chargés à la demande (import dynamique → morceau séparé du bundle).
 */
import { makeGen1000 } from '@/data/gen1000'
import { InstanceSchema } from '@/types/vrp'
import { mockSolve } from './mockRun'
import type { ApiClient, InstanceSummary } from './types'

const SUMMARIES: InstanceSummary[] = [
  { id: 'NANCY-60', name: 'NANCY-60 — Nancy et vallées vosgiennes', customers: 60, hasGeometry: true },
  { id: 'GEN-1000', name: 'GEN-1000 — instance générée (charge)', customers: 1000, hasGeometry: false },
]

export const mockApi: ApiClient = {
  mode: 'mock',
  listInstances: () => Promise.resolve(SUMMARIES),
  async getInstance(id) {
    if (id === 'NANCY-60') {
      const json: unknown = (await import('@/data/nancy-60.instance.json')).default
      return InstanceSchema.parse(json)
    }
    if (id === 'GEN-1000') return makeGen1000()
    throw new Error(`Instance inconnue : ${id}`)
  },
  solve: mockSolve,
}
