/**
 * Rôle : interface commune des implémentations de l'API (mock et HTTP).
 */
import type { HistoryPoint, Instance, SolveRequest, SolveResult } from '@/types/vrp'

export interface InstanceSummary {
  id: string
  name: string
  customers: number
  hasGeometry: boolean
}

export interface RunProgress {
  /** Temps écoulé côté solveur (s). */
  t: number
  /** Points de convergence reçus depuis le début (≤ 500, pas ≈ 0,5 s). */
  history: HistoryPoint[]
}

/** Calcul long : progression, résultat final, annulation (CLAUDE.md §5). */
export interface RunHandle {
  onProgress(cb: (p: RunProgress) => void): void
  /** Rejetée par `RunCancelled` si l'utilisateur annule. */
  result: Promise<SolveResult>
  cancel(): void
}

export class RunCancelled extends Error {
  constructor() {
    super('Calcul annulé')
    this.name = 'RunCancelled'
  }
}

export interface ApiClient {
  readonly mode: 'mock' | 'http'
  listInstances(): Promise<InstanceSummary[]>
  getInstance(id: string): Promise<Instance>
  solve(req: SolveRequest): RunHandle
}
