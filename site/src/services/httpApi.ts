/**
 * Rôle : implémentation HTTP de l'API, prête pour le solveur Python (non utilisée tant qu'il n'expose pas de serveur).
 * Routes attendues (à confirmer avec l'équipe solveur) :
 *   GET  {VITE_API_URL}/instances          → InstanceSummary[]
 *   GET  {VITE_API_URL}/instances/:id      → Instance (format de types/vrp.ts)
 *   POST {VITE_API_URL}/solve              → (phase 3) lancement + suivi
 * Toute réponse est validée par Zod à la frontière.
 */
import { z } from 'zod'
import { InstanceSchema } from '@/types/vrp'
import type { ApiClient } from './types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const SummarySchema = z.array(z.object({ id: z.string(), name: z.string(), customers: z.number().int(), hasGeometry: z.boolean() }))

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Solveur : HTTP ${res.status} sur ${path}`)
  return res.json()
}

export const httpApi: ApiClient = {
  mode: 'http',
  listInstances: async () => SummarySchema.parse(await getJson('/instances')),
  getInstance: async (id) => InstanceSchema.parse(await getJson(`/instances/${encodeURIComponent(id)}`)),
}
