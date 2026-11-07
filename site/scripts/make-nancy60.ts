/**
 * Génère l'instance de démonstration NANCY-60 et un RÉSULTAT SIMULÉ (remplaçant du solveur en mode mock).
 * À exécuter UNE SEULE FOIS (les fichiers produits sont commités) : `node scripts/make-nancy60.ts`
 *
 * - 60 clients FICTIFS (« Client 01 — Gérardmer »…), tirés avec une graine fixe autour de communes de Nancy
 *   et des vallées vosgiennes (pour le relief). Aucune personne ni adresse réelle.
 * - Requêtes au serveur de démonstration OSRM (router.project-osrm.org), sur ces points fictifs uniquement :
 *   1 matrice distances/durées (table) + 1 tracé par camion (route). Le navigateur n'appelle jamais OSRM.
 * - Le « résultat » est une solution SIMULÉE (regroupement géographique + plus proche voisin + 2-opt) avec un
 *   horaire calculé ici, hors navigateur ; il sert uniquement à faire vivre l'interface en attendant le solveur.
 */
import { writeFileSync } from 'node:fs'
import { InstanceSchema, SolveResultSchema, type Customer, type Instance, type Leg, type Route, type Stop } from '../src/types/vrp.ts'

const SEED = 60
const OSRM = 'https://router.project-osrm.org'
const UA = { 'User-Agent': 'CesiCDP-demo-generator (student project)' }

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(SEED)
const int = (a: number, b: number): number => a + Math.floor(rng() * (b - a + 1))

/** Communes servant de centres de tirage ; `truck` = regroupement de la solution simulée. */
const CLUSTERS = [
  { town: 'Nancy', lng: 6.1844, lat: 48.6921, n: 7, r: 1.4, truck: 1 },
  { town: 'Vandœuvre-lès-Nancy', lng: 6.1733, lat: 48.6567, n: 4, r: 1.0, truck: 1 },
  { town: 'Laxou', lng: 6.1489, lat: 48.6847, n: 3, r: 0.9, truck: 1 },
  { town: 'Malzéville', lng: 6.203, lat: 48.709, n: 3, r: 0.9, truck: 1 },
  { town: 'Essey-lès-Nancy', lng: 6.222, lat: 48.7, n: 3, r: 0.9, truck: 1 },
  { town: 'Jarville-la-Malgrange', lng: 6.203, lat: 48.67, n: 3, r: 0.8, truck: 1 },
  { town: 'Villers-lès-Nancy', lng: 6.153, lat: 48.673, n: 2, r: 0.8, truck: 1 },
  { town: 'Baccarat', lng: 6.74, lat: 48.45, n: 2, r: 1.0, truck: 2 },
  { town: 'Rambervillers', lng: 6.634, lat: 48.346, n: 3, r: 1.0, truck: 2 },
  { town: 'Saint-Dié-des-Vosges', lng: 6.9496, lat: 48.2846, n: 6, r: 1.5, truck: 2 },
  { town: 'Bruyères', lng: 6.719, lat: 48.208, n: 3, r: 1.0, truck: 2 },
  { town: 'Gérardmer', lng: 6.877, lat: 48.072, n: 6, r: 1.5, truck: 3 },
  { town: 'La Bresse', lng: 6.875, lat: 47.999, n: 4, r: 1.2, truck: 3 },
  { town: 'Épinal', lng: 6.45, lat: 48.173, n: 6, r: 1.6, truck: 4 },
  { town: 'Remiremont', lng: 6.591, lat: 48.017, n: 5, r: 1.3, truck: 4 },
]

const DEPOT = { name: 'Dépôt fictif — Nancy', lng: 6.2045, lat: 48.6862, tw: { a: 7 * 60, b: 19 * 60 } }
const TRAFFIC = [
  { from: 0, to: 450, factor: 1 },
  { from: 450, to: 570, factor: 1.6 },
  { from: 570, to: 990, factor: 1.15 },
  { from: 990, to: 1440, factor: 1.45 },
]
const factorAt = (t: number): number => TRAFFIC.find((s) => t >= s.from && t < s.to)?.factor ?? 1

// 1) clients fictifs
const customers: Customer[] = []
const truckOf = new Map<number, number>()
for (const c of CLUSTERS) {
  for (let i = 0; i < c.n; i++) {
    const id = customers.length + 1
    const ang = rng() * 2 * Math.PI
    const dist = Math.sqrt(rng()) * c.r // km, uniforme dans le disque
    const lat = c.lat + (dist / 111.32) * Math.sin(ang)
    const lng = c.lng + (dist / (111.32 * Math.cos((c.lat * Math.PI) / 180))) * Math.cos(ang)
    const urban = c.truck === 1
    customers.push({
      id,
      name: `Client ${String(id).padStart(2, '0')} — ${c.town}`,
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
      demand: urban ? int(1, 5) : int(2, 8),
      tw: null, // fixée après l'horaire simulé (étape 4)
      service: urban ? int(5, 10) : int(8, 15),
    })
    truckOf.set(id, c.truck)
  }
}

// 2) matrice OSRM (une requête) : nœud 0 = dépôt
const points = [DEPOT, ...customers]
const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
const tableRes = await fetch(`${OSRM}/table/v1/driving/${coords}?annotations=distance,duration`, { headers: UA })
const table = (await tableRes.json()) as { code: string; distances: number[][]; durations: number[][] }
if (table.code !== 'Ok') throw new Error(`OSRM table : ${table.code}`)
const D = (i: number, j: number): number => table.distances[i]?.[j] ?? Infinity
const T = (i: number, j: number): number => (table.durations[i]?.[j] ?? Infinity) / 60

// 3) solution simulée : groupe → plus proche voisin → 2-opt (sur la distance routière)
const tourLen = (t: number[]): number => t.reduce((s, v, i) => s + D(i === 0 ? 0 : (t[i - 1] ?? 0), v), 0) + D(t.at(-1) ?? 0, 0)
function nearestNeighbour(ids: number[]): number[] {
  const left = new Set(ids)
  const tour: number[] = []
  let cur = 0
  while (left.size) {
    let best = -1
    for (const v of left) if (best < 0 || D(cur, v) < D(cur, best)) best = v
    tour.push(best)
    left.delete(best)
    cur = best
  }
  return tour
}
function twoOpt(t: number[]): number[] {
  let best = t.slice()
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const cand = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)]
        if (tourLen(cand) < tourLen(best) - 1e-6) {
          best = cand
          improved = true
        }
      }
    }
  }
  return best
}
const tours = [1, 2, 3, 4].map((k) => twoOpt(nearestNeighbour(customers.filter((c) => truckOf.get(c.id) === k).map((c) => c.id))))

// 4) horaire simulé (départ à l'ouverture, trafic de la tranche de départ), puis fenêtres tirées AUTOUR de
//    l'heure de passage pour illustrer les trois statuts : à l'heure (majorité), attente, retard.
const byId = new Map(customers.map((c) => [c.id, c]))
for (const tour of tours) {
  let t = DEPOT.tw.a + 30
  let prev = 0
  for (const id of tour) {
    const c = byId.get(id)
    if (!c) continue
    t += T(prev, id) * factorAt(t)
    const roll = rng()
    const arrival = Math.round(t)
    if (roll < 0.1) c.tw = null
    else if (roll < 0.22) c.tw = { a: arrival + int(15, 40), b: arrival + int(100, 160) } // attente
    else if (roll < 0.28) c.tw = { a: arrival - int(120, 150), b: arrival - int(5, 20) } // retard
    else {
      const a = Math.max(DEPOT.tw.a, arrival - int(30, 90))
      c.tw = { a, b: a + int(120, 180) }
    }
    if (c.tw) c.tw = { a: Math.round(c.tw.a / 5) * 5, b: Math.round(c.tw.b / 5) * 5 }
    t = Math.max(t, c.tw?.a ?? t) + c.service
    prev = id
  }
}

function schedule(tour: number[], vehicleId: number, geometry: Route['geometry']): Route {
  const stops: Stop[] = []
  const legs: Leg[] = []
  const start = DEPOT.tw.a + 30
  let t = start
  let prev = 0
  let load = 0
  const step = (to: number): void => {
    const factor = factorAt(t)
    const travel = T(prev, to) * factor
    legs.push({ from: prev, to, departure: t, travelMin: Math.round(travel * 10) / 10, distanceM: Math.round(D(prev, to)), factor })
    t += travel
  }
  for (const id of tour) {
    const c = byId.get(id)
    if (!c) continue
    step(id)
    const arrival = t
    const wait = c.tw ? Math.max(0, c.tw.a - arrival) : 0
    const late = c.tw ? Math.max(0, arrival - c.tw.b) : 0
    t = arrival + wait + c.service
    stops.push({ customerId: id, arrival: Math.round(arrival * 10) / 10, wait: Math.round(wait * 10) / 10, departure: Math.round(t * 10) / 10, late: Math.round(late * 10) / 10 })
    load += c.demand
    prev = id
  }
  step(0)
  return { vehicleId, load, distanceM: Math.round(tourLen(tour)), geometry, start, end: Math.round(t * 10) / 10, stops, legs }
}

// 5) tracés routiers (une requête par camion)
const routes: Route[] = []
for (const [i, tour] of tours.entries()) {
  const wp = [0, ...tour, 0].map((id) => points[id]).map((p) => `${p?.lng},${p?.lat}`).join(';')
  const res = await fetch(`${OSRM}/route/v1/driving/${wp}?overview=full&geometries=geojson&steps=false`, { headers: UA })
  const json = (await res.json()) as { code: string; routes: Array<{ geometry: { coordinates: Array<[number, number]> } }> }
  if (json.code !== 'Ok') throw new Error(`OSRM route : ${json.code}`)
  const line = json.routes[0]?.geometry.coordinates.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5] as [number, number])
  routes.push(schedule(tour, i + 1, line ? { type: 'LineString', coordinates: line } : null))
  await new Promise((r) => setTimeout(r, 1100)) // politesse envers le serveur de démonstration
}

// 6) tournée de comparaison (CO₂) : plus proche voisin global découpé par capacité, sans regroupement
const Q = 100
const compTours: number[][] = []
{
  const left = new Set(customers.map((c) => c.id))
  while (left.size) {
    const tour: number[] = []
    let cur = 0
    let load = 0
    for (;;) {
      let best = -1
      for (const v of left) if ((byId.get(v)?.demand ?? 0) + load <= Q && (best < 0 || D(cur, v) < D(cur, best))) best = v
      if (best < 0) break
      tour.push(best)
      left.delete(best)
      load += byId.get(best)?.demand ?? 0
      cur = best
    }
    compTours.push(tour)
  }
}
const compDist = compTours.reduce((s, t) => s + tourLen(t), 0)
const totalDist = routes.reduce((s, r) => s + (r.distanceM ?? 0), 0)

const instance: Instance = InstanceSchema.parse({
  id: 'NANCY-60',
  name: 'NANCY-60 — Nancy et vallées vosgiennes (fictif)',
  depot: DEPOT,
  customers,
  fleet: { k: 4, Q, fixedCost: 0, baseSpeedKmh: 50 },
  traffic: { slots: TRAFFIC },
  options: { timeWindows: 'strict', allowWait: true },
  meta: { source: 'demo', coordinates: 'geo', note: `Clients fictifs (graine ${SEED}). Distances et tracés : OSRM, calculés une fois le ${new Date().toISOString().slice(0, 10)}.` },
})

const result = SolveResultSchema.parse({
  cost: Math.round(totalDist) / 1000,
  costInitial: Math.round(compDist) / 1000,
  objective: 'Distance routière totale (km) ; résultat SIMULÉ en attendant le solveur',
  valid: true,
  message: 'Résultat simulé (mock) : regroupement géographique, plus proche voisin, 2-opt.',
  iterations: 0,
  routes,
  history: [],
  comparison: { label: 'Plus proche voisin découpé par capacité (simulé)', distanceM: Math.round(compDist) },
  // les fenêtres ont été tirées APRÈS la construction des tournées : cette solution ne les respecte pas
  ignoredConstraints: ['timeWindows'],
})

writeFileSync(new URL('../src/data/nancy-60.instance.json', import.meta.url), JSON.stringify(instance, null, 1) + '\n')
writeFileSync(new URL('../src/data/nancy-60.result.json', import.meta.url), JSON.stringify(result) + '\n')
console.log(`NANCY-60 : ${customers.length} clients, ${routes.length} tournées, ${(totalDist / 1000).toFixed(1)} km (comparaison ${(compDist / 1000).toFixed(1)} km)`)
for (const r of routes) {
  const end = r.end ?? 0
  const late = r.stops.filter((x) => (x.late ?? 0) > 0).length
  const wait = r.stops.filter((x) => (x.wait ?? 0) > 0).length
  console.log(`  camion ${r.vehicleId} : ${r.stops.length} arrêts, charge ${r.load}, ${((r.distanceM ?? 0) / 1000).toFixed(1)} km, retour ${Math.floor(end / 60)}h${String(Math.round(end % 60)).padStart(2, '0')}, retards ${late}, attentes ${wait}`)
}
