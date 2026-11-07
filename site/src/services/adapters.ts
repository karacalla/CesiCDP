/**
 * Rôle : traduit les réponses du solveur Python (noms français : `cout`, `valide`, `historique`…) vers le contrat
 *   TypeScript (`types/vrp.ts`). Le reste du code ne voit QUE les types TS.
 * Choix retenu : schéma Zod de la réponse brute + fonction de traduction, testés ensemble.
 * Alternative écartée : renommer côté Python (le notebook et les expériences de l'équipe en dépendent).
 * Question probable du jury : « et si le solveur ne renvoie que l'ordre de passage ? » → c'est le cas de
 *   `resoudre()` aujourd'hui : les arrêts sont créés SANS horaire (null) et l'interface affiche « horaires non
 *   fournis par cet algorithme » ; elle ne les invente pas.
 */
import { z } from 'zod'
import { SolveResultSchema, type Instance, type Route, type SolveResult } from '@/types/vrp'

const n = z.number()
const nn = z.number().nullable().optional()

/** Arrêt détaillé (réponse étendue attendue de l'équipe solveur). */
const RawStop = z.object({ client: n, arrivee: nn, attente: nn, depart: nn, retard: nn })
const RawLeg = z.object({ de: n, vers: n, depart: n, duree_min: n, distance_m: n, coef: n })
const RawTour = z.object({
  camion: n,
  charge: n.optional(),
  distance_m: nn,
  geometrie: z.array(z.array(n)).nullable().optional(),
  debut: nn,
  fin: nn,
  arrets: z.array(RawStop),
  trajets: z.array(RawLeg).optional(),
})

export const SolverRawResultSchema = z.object({
  cout: n,
  cout_initial: n,
  valide: z.boolean(),
  message: z.string().default(''),
  iterations: z.number().int().default(0),
  objectif: z.string().optional(),
  bks: n.optional(),
  /** Sortie actuelle de `resoudre()` : listes d'indices de clients, sans horaire. */
  routes: z.array(z.array(n)).optional(),
  /** Sortie étendue (contrat) : tournées détaillées avec horaires. */
  tournees: z.array(RawTour).optional(),
  /** (t, coût courant, meilleur coût, température) toutes les ≈ 0,5 s. */
  historique: z.array(z.tuple([n, n, n, n])).default([]),
  comparaison: z.object({ libelle: z.string(), distance_m: n }).nullable().optional(),
  contraintes_ignorees: z.array(z.enum(['fenetres', 'trafic'])).default([]),
})
export type SolverRawResult = z.infer<typeof SolverRawResultSchema>

const DEFAULT_OBJECTIVE = 'Somme des longueurs des tournées (unité de l’instance)'

export function fromSolverResult(raw: unknown, instance: Instance): SolveResult {
  const r = SolverRawResultSchema.parse(raw)
  const demand = new Map(instance.customers.map((c) => [c.id, c.demand]))
  const routes: Route[] = r.tournees
    ? r.tournees.map((t) => ({
        vehicleId: t.camion,
        load: t.charge ?? t.arrets.reduce((s, a) => s + (demand.get(a.client) ?? 0), 0),
        distanceM: t.distance_m ?? null,
        geometry: t.geometrie && t.geometrie.length >= 2 ? { type: 'LineString' as const, coordinates: t.geometrie.map((p) => [p[0] ?? 0, p[1] ?? 0] as [number, number]) } : null,
        start: t.debut ?? null,
        end: t.fin ?? null,
        stops: t.arrets.map((a) => ({ customerId: a.client, arrival: a.arrivee ?? null, wait: a.attente ?? null, departure: a.depart ?? null, late: a.retard ?? null })),
        legs: (t.trajets ?? []).map((l) => ({ from: l.de, to: l.vers, departure: l.depart, travelMin: l.duree_min, distanceM: l.distance_m, factor: l.coef })),
      }))
    : (r.routes ?? []).map((ids, i) => ({
        vehicleId: i + 1,
        load: ids.reduce((s, id) => s + (demand.get(id) ?? 0), 0),
        distanceM: null,
        geometry: null,
        start: null,
        end: null,
        stops: ids.map((id) => ({ customerId: id, arrival: null, wait: null, departure: null, late: null })),
        legs: [],
      }))
  const bks = r.bks ?? instance.meta.bks
  return SolveResultSchema.parse({
    cost: r.cout,
    costInitial: r.cout_initial,
    objective: r.objectif ?? instance.meta.bksObjective ?? DEFAULT_OBJECTIVE,
    valid: r.valide,
    message: r.message,
    iterations: r.iterations,
    bks,
    gap: bks ? (100 * (r.cout - bks)) / bks : undefined,
    routes,
    history: r.historique.map(([t, cost, best, temp]) => ({ t, cost, best, temp })),
    comparison: r.comparaison ? { label: r.comparaison.libelle, distanceM: r.comparaison.distance_m } : null,
    ignoredConstraints: r.contraintes_ignorees.map((c) => (c === 'fenetres' ? 'timeWindows' : 'traffic')),
  })
}
