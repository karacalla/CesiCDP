/**
 * Rôle : implémentation HTTP de l'API, prête pour le solveur Python (non utilisée tant qu'il n'expose pas de serveur).
 * Routes attendues (à confirmer avec l'équipe solveur, voir docs/CONTRAT_SOLVEUR.md) :
 *   GET    /instances          → InstanceSummary[]
 *   GET    /instances/:id      → Instance (format de types/vrp.ts)
 *   POST   /solve              → { run_id }                       (corps : SolveRequest)
 *   GET    /runs/:id           → { etat, t, historique, resultat?, message? }   (interrogé toutes les 0,5 s)
 *   DELETE /runs/:id           → annulation
 * Toute réponse est validée par Zod à la frontière et traduite par adapters.ts.
 */
import { z } from 'zod'
import { InstanceSchema, type SolveRequest, type SolveResult } from '@/types/vrp'
import { fromSolverResult } from './adapters'
import { RunCancelled, type ApiClient, type RunHandle, type RunProgress } from './types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const POLL_MS = 500

const SummarySchema = z.array(z.object({ id: z.string(), name: z.string(), customers: z.number().int(), hasGeometry: z.boolean() }))
const RunStatusSchema = z.object({
  etat: z.enum(['en_cours', 'termine', 'erreur']),
  t: z.number().default(0),
  historique: z.array(z.tuple([z.number(), z.number(), z.number(), z.number()])).default([]),
  resultat: z.unknown().optional(),
  message: z.string().optional(),
})

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`Solveur : HTTP ${res.status} sur ${path}`)
  return res.status === 204 ? null : res.json()
}

function solve(req: SolveRequest): RunHandle {
  const listeners: Array<(p: RunProgress) => void> = []
  let runId: string | null = null
  let cancelled = false
  let rejectRun: ((e: Error) => void) | undefined
  const result = new Promise<SolveResult>((resolve, reject) => {
    rejectRun = reject
    void (async () => {
      try {
        const started = z.object({ run_id: z.string() }).parse(await call('/solve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }))
        runId = started.run_id
        for (;;) {
          await new Promise((r) => setTimeout(r, POLL_MS))
          if (cancelled) return
          const s = RunStatusSchema.parse(await call(`/runs/${encodeURIComponent(runId)}`))
          const history = s.historique.map(([t, cost, best, temp]) => ({ t, cost, best, temp }))
          listeners.forEach((l) => l({ t: s.t, history }))
          if (s.etat === 'termine') return resolve(fromSolverResult(s.resultat, req.instance))
          if (s.etat === 'erreur') return reject(new Error(s.message ?? 'Erreur du solveur'))
        }
      } catch (e) {
        if (!cancelled) reject(e instanceof Error ? e : new Error(String(e)))
      }
    })()
  })
  return {
    onProgress: (cb) => void listeners.push(cb),
    result,
    cancel: () => {
      cancelled = true
      if (runId) void call(`/runs/${encodeURIComponent(runId)}`, { method: 'DELETE' }).catch(() => undefined)
      rejectRun?.(new RunCancelled())
    },
  }
}

export const httpApi: ApiClient = {
  mode: 'http',
  listInstances: async () => SummarySchema.parse(await call('/instances')),
  getInstance: async (id) => InstanceSchema.parse(await call(`/instances/${encodeURIComponent(id)}`)),
  solve,
}
