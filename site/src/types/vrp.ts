/**
 * Rôle : CONTRAT DE DONNÉES entre l'interface et le solveur Python (source unique, CLAUDE.md §5).
 *   Les schémas Zod valident toute donnée qui entre (import, réponse d'API) ; les types TS en sont déduits,
 *   ce qui garantit qu'ils ne divergent jamais.
 * Choix retenu : Zod → `z.infer` (une seule définition pour la validation et le typage).
 * Alternative écartée : interfaces TS + validation écrite à la main (deux vérités qui finissent par diverger).
 * Question probable du jury : « que se passe-t-il si le solveur renvoie un champ manquant ? » → la réponse est
 *   rejetée à la frontière (services/adapters.ts) avec un message ; l'interface n'affiche jamais une donnée non vérifiée.
 *
 * Unités : temps en MINUTES depuis 00:00 (réel), distances en MÈTRES, coordonnées [lng, lat, alt?].
 * Vocabulaire : dépôt = nœud 0, clients 1…n ; q_i demande, Q capacité, k camions, [a_i, b_i] fenêtre,
 *   s_i durée de service, d^t coefficient de trafic de la tranche t.
 */
import { z } from 'zod'

export const DAY_MIN = 0
export const DAY_MAX = 24 * 60
/** Horizon maximal accepté : les jeux Solomon / Gehring-Homberger ont des unités de temps abstraites > 24 h. */
export const HORIZON_MAX = 7 * DAY_MAX

const minutes = z.number().finite().min(DAY_MIN).max(HORIZON_MAX)
const dayMinutes = z.number().finite().min(DAY_MIN).max(DAY_MAX)

/** Fenêtre horaire [a, b] en minutes, a ≤ b. */
export const TimeWindowSchema = z
  .object({ a: minutes, b: minutes })
  .refine((w) => w.a <= w.b, { message: 'début de fenêtre après la fin (a > b)', path: ['b'] })
export type TimeWindow = z.infer<typeof TimeWindowSchema>

const latitude = z.number().finite().min(-90).max(90)
const longitude = z.number().finite().min(-180).max(180)
/** Coordonnée brute : géographique (contrôlée au niveau de l'instance) ou plane (VRPLIB, Solomon). */
const coord = z.number().finite()

export const CustomerSchema = z.object({
  /** Identifiant 1…n (le dépôt est le nœud 0). */
  id: z.number().int().min(1),
  name: z.string().trim().min(1, 'nom vide').max(120),
  /** Latitude (ou y si coordonnées planes). */
  lat: coord,
  /** Longitude (ou x si coordonnées planes). */
  lng: coord,
  /** q_i ≥ 0, dans l'unité de la capacité Q. */
  demand: z.number().finite().min(0, 'demande négative'),
  /** [a_i, b_i] ; null = pas de contrainte horaire. */
  tw: TimeWindowSchema.nullable(),
  /** s_i, durée de service en minutes. */
  service: z.number().finite().min(0, 'durée de service négative').max(DAY_MAX),
})
export type Customer = z.infer<typeof CustomerSchema>

export const DepotSchema = z.object({
  name: z.string().trim().min(1, 'nom vide').max(120),
  lat: coord,
  lng: coord,
  /** Horaires d'ouverture : les camions partent après a et rentrent avant b. */
  tw: TimeWindowSchema,
})
export type Depot = z.infer<typeof DepotSchema>

export const FleetSchema = z.object({
  /** k, nombre de camions disponibles. */
  k: z.number().int().min(1, 'au moins un camion').max(500),
  /** Q, capacité d'un camion (flotte homogène). */
  Q: z.number().finite().positive('capacité nulle ou négative'),
  /** Coût fixe par camion mobilisé (unité monétaire libre). */
  fixedCost: z.number().finite().min(0),
  /** Vitesse de référence hors trafic (km/h), multipliée par 1/d^t selon la tranche. */
  baseSpeedKmh: z.number().finite().positive().max(130),
})
export type Fleet = z.infer<typeof FleetSchema>

/** Tranche de trafic [from, to) de coefficient factor ≥ 1 (temps de parcours × factor). */
export const TrafficSlotSchema = z
  .object({ from: dayMinutes, to: dayMinutes, factor: z.number().finite().min(1, 'coefficient < 1').max(10) })
  .refine((s) => s.from < s.to, { message: 'tranche vide ou inversée', path: ['to'] })
export type TrafficSlot = z.infer<typeof TrafficSlotSchema>

/** Les tranches doivent être contiguës et couvrir toute la journée (00:00 → 24:00). */
export const TrafficSchema = z.object({ slots: z.array(TrafficSlotSchema).min(1) }).superRefine((t, ctx) => {
  const s = t.slots
  if (s[0]?.from !== DAY_MIN) ctx.addIssue({ code: 'custom', message: 'la première tranche doit commencer à 00:00', path: ['slots', 0, 'from'] })
  if (s.at(-1)?.to !== DAY_MAX) ctx.addIssue({ code: 'custom', message: 'la dernière tranche doit finir à 24:00', path: ['slots', s.length - 1, 'to'] })
  for (let i = 1; i < s.length; i++) {
    if (s[i]?.from !== s[i - 1]?.to) ctx.addIssue({ code: 'custom', message: 'tranches non contiguës', path: ['slots', i, 'from'] })
  }
})
export type Traffic = z.infer<typeof TrafficSchema>

export const OptionsSchema = z.object({
  /** 'strict' : arrivée après b_i interdite ; 'off' : fenêtres ignorées. */
  timeWindows: z.enum(['off', 'strict']),
  /** Arrivée avant a_i : attendre (true) ou interdit (false). */
  allowWait: z.boolean(),
})
export type Options = z.infer<typeof OptionsSchema>

export const InstanceMetaSchema = z.object({
  source: z.enum(['demo', 'generated', 'csv', 'json', 'vrplib', 'solomon']),
  /** 'geo' : lat/lng réels ; 'planar' : coordonnées planes (VRPLIB, Solomon) → pas d'affichage cartographique. */
  coordinates: z.enum(['geo', 'planar']),
  /** Instance de référence (Solomon, X) placée sur la carte par PROJECTION de ses (x, y), pour l'affichage seulement :
   *  distances et coûts restent ceux de l'instance (unité abstraite), jamais des km (ADR-027). */
  projected: z.boolean().optional(),
  /** Meilleure solution connue (jeux de référence) et définition de son objectif. */
  bks: z.number().positive().optional(),
  bksObjective: z.string().optional(),
  note: z.string().optional(),
})
export type InstanceMeta = z.infer<typeof InstanceMetaSchema>

export const InstanceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    depot: DepotSchema,
    customers: z.array(CustomerSchema),
    fleet: FleetSchema,
    traffic: TrafficSchema,
    options: OptionsSchema,
    meta: InstanceMetaSchema,
  })
  .superRefine((inst, ctx) => {
    if (inst.meta.coordinates !== 'geo') return
    const check = (lat: number, lng: number, path: Array<string | number>): void => {
      if (!latitude.safeParse(lat).success) ctx.addIssue({ code: 'custom', message: 'latitude hors [−90, 90]', path: [...path, 'lat'] })
      if (!longitude.safeParse(lng).success) ctx.addIssue({ code: 'custom', message: 'longitude hors [−180, 180]', path: [...path, 'lng'] })
    }
    check(inst.depot.lat, inst.depot.lng, ['depot'])
    inst.customers.forEach((c, i) => check(c.lat, c.lng, ['customers', i]))
    const ids = new Set<number>()
    inst.customers.forEach((c, i) => {
      if (ids.has(c.id)) ctx.addIssue({ code: 'custom', message: `identifiant ${c.id} en double`, path: ['customers', i, 'id'] })
      ids.add(c.id)
    })
  })

/** Contrôle géographique d'un point (utilisé aussi ligne à ligne par la table). */
export function isGeoPoint(lat: number, lng: number): boolean {
  return latitude.safeParse(lat).success && longitude.safeParse(lng).success
}
export type Instance = z.infer<typeof InstanceSchema>

// ————————————————————————————————— Résolution —————————————————————————————————

export const AlgoSchema = z.enum(['sa', 'clarke-wright', 'milp'])
export type Algo = z.infer<typeof AlgoSchema>

/** Réglages = ceux de `resoudre(...)` dans algorithme/recuit_simple.py. */
export const SolveParamsSchema = z.object({
  durationS: z.number().positive().max(3600),
  seed: z.number().int().min(0),
  /** K voisins proches considérés par mouvement. */
  K: z.number().int().min(1).max(200),
  /** Températures initiale et finale, en fraction de la longueur moyenne d'un trajet. */
  t0: z.number().positive(),
  t1: z.number().positive(),
  /** Probabilités des mouvements, dans l'ordre fourni par le solveur (4 aujourd'hui : déplacer, échanger, 2-opt, 2-opt*). */
  moveProbas: z.array(z.number().min(0)).min(1),
  kMax: z.number().int().min(1).nullable().optional(),
})
export type SolveParams = z.infer<typeof SolveParamsSchema>

export const SolveRequestSchema = z.object({ instance: InstanceSchema, algo: AlgoSchema, params: SolveParamsSchema })
export type SolveRequest = z.infer<typeof SolveRequestSchema>

export const StopSchema = z.object({
  customerId: z.number().int().min(1),
  /** Heure d'arrivée, attente avant a_i, heure de départ, retard après b_i (minutes) ;
   *  null si l'algorithme ne produit pas d'horaire (CVRP pur) : l'interface ne les recalcule jamais. */
  arrival: minutes.nullable(),
  wait: z.number().min(0).nullable(),
  departure: minutes.nullable(),
  late: z.number().min(0).nullable(),
})
export type Stop = z.infer<typeof StopSchema>

/** Trajet entre deux nœuds consécutifs, avec la tranche de trafic appliquée par le solveur (vitesse en simulation). */
export const LegSchema = z.object({
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  departure: minutes,
  travelMin: z.number().min(0),
  distanceM: z.number().min(0),
  factor: z.number().min(1),
})
export type Leg = z.infer<typeof LegSchema>

const Position = z.union([z.tuple([longitude, latitude]), z.tuple([longitude, latitude, z.number()])])

export const RouteSchema = z.object({
  vehicleId: z.number().int().min(1),
  load: z.number().min(0),
  /** Longueur de la tournée dans l'unité de l'instance (mètres si géographique) ; null si non fournie. */
  distanceM: z.number().min(0).nullable(),
  /** Tracé routier (GeoJSON LineString) ; null si le solveur ne fournit que l'ordre de passage. */
  geometry: z.object({ type: z.literal('LineString'), coordinates: z.array(Position).min(2) }).nullable(),
  start: minutes.nullable(),
  end: minutes.nullable(),
  stops: z.array(StopSchema),
  legs: z.array(LegSchema),
})
export type Route = z.infer<typeof RouteSchema>

export const HistoryPointSchema = z.object({ t: z.number().min(0), cost: z.number(), best: z.number(), temp: z.number().min(0) })
export type HistoryPoint = z.infer<typeof HistoryPointSchema>

export const SolveResultSchema = z.object({
  cost: z.number(),
  costInitial: z.number(),
  /** Définition de l'objectif minimisé, toujours affichée à côté d'un écart. */
  objective: z.string().min(1),
  valid: z.boolean(),
  message: z.string(),
  iterations: z.number().int().min(0),
  bks: z.number().positive().optional(),
  gap: z.number().optional(),
  routes: z.array(RouteSchema),
  history: z.array(HistoryPointSchema),
  /** Tournée de comparaison calculée PAR LE SOLVEUR (ex. plus proche voisin) pour le CO₂ évité. */
  comparison: z.object({ label: z.string(), distanceM: z.number().min(0) }).nullable(),
  /** Contraintes activées que l'algorithme n'a pas prises en compte (jamais de faux résultat silencieux). */
  ignoredConstraints: z.array(z.enum(['timeWindows', 'traffic'])),
})
export type SolveResult = z.infer<typeof SolveResultSchema>

/** Ce que chaque algorithme sait traiter (déclaré par le solveur). */
export interface AlgoCapabilities {
  timeWindows: boolean
  traffic: boolean
}
