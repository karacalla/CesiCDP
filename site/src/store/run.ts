/**
 * Rôle : état du calcul (réglages, progression, résultat, annulation), un seul calcul à la fois.
 * Question probable du jury : « que se passe-t-il si on change de vue pendant le calcul ? » → rien : le calcul vit
 *   dans ce store, pas dans un composant ; la progression reprend à l'affichage.
 */
import { create } from 'zustand'
import { DEFAULT_PARAMS } from '@/config/solver'
import { api } from '@/services/api'
import { RunCancelled, type RunHandle } from '@/services/types'
import type { Algo, HistoryPoint, Instance, SolveParams, SolveResult } from '@/types/vrp'

export type RunStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'error'

interface RunState {
  algo: Algo
  params: SolveParams
  status: RunStatus
  elapsed: number
  history: HistoryPoint[]
  result: SolveResult | null
  error: string | null
  setAlgo: (a: Algo) => void
  setParams: (p: Partial<SolveParams>) => void
  start: (instance: Instance) => void
  cancel: () => void
}

let handle: RunHandle | null = null

export const useRun = create<RunState>((set, get) => ({
  algo: 'sa',
  params: DEFAULT_PARAMS,
  status: 'idle',
  elapsed: 0,
  history: [],
  result: null,
  error: null,
  setAlgo: (algo) => set({ algo }),
  setParams: (p) => set({ params: { ...get().params, ...p } }),
  start: (instance) => {
    if (get().status === 'running') return
    const { algo, params } = get()
    set({ status: 'running', elapsed: 0, history: [], result: null, error: null })
    const h = api.solve({ instance, algo, params })
    handle = h
    h.onProgress((p) => {
      if (handle === h) set({ elapsed: p.t, history: p.history })
    })
    h.result.then(
      (result) => {
        if (handle === h) set({ status: 'done', result, history: result.history, elapsed: params.durationS })
      },
      (e: unknown) => {
        if (handle !== h) return
        if (e instanceof RunCancelled) set({ status: 'cancelled' })
        else set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
      },
    )
  },
  cancel: () => handle?.cancel(),
}))
