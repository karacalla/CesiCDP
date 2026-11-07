/**
 * Rôle : géométrie d'une tournée pour l'AFFICHAGE : position du camion à une heure donnée, découpe du tracé en
 *   « parcouru » / « à venir », cap du curseur. On interpole le long du tracé entre des horaires FOURNIS par le
 *   solveur (départ, arrivées, départs des arrêts) ; on ne recalcule aucun horaire.
 * Choix retenu : deux sources GeoJSON (parcouru, à venir) plutôt qu'un `line-gradient` (qui ne sait pas faire de
 *   pointillés) ; arrêts rattachés au sommet le plus proche du tracé, dans l'ordre de passage.
 * Question probable du jury : « où est le camion entre deux arrêts ? » → à la distance proportionnelle au temps
 *   écoulé sur le trajet (hypothèse de vitesse constante sur le trajet, affichage seulement).
 */
import type { Customer, Route } from '@/types/vrp'

export type LngLat = [number, number]

const R = 6371008.8
const rad = (d: number): number => (d * Math.PI) / 180

export function haversine(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1])
  const dLng = rad(b[0] - a[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Cap géographique de a vers b, en degrés (0 = nord, sens horaire). */
export function bearing(a: LngLat, b: LngLat): number {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]))
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export interface RouteTrack {
  coords: LngLat[]
  /** Distance cumulée (m) à chaque sommet. */
  cum: number[]
  /** Distance cumulée (m) du sommet rattaché à chaque arrêt, dans l'ordre de passage. */
  stopAt: number[]
}

export function buildTrack(route: Route, customers: ReadonlyMap<number, Customer>): RouteTrack | null {
  const coords = route.geometry?.coordinates.map((p) => [p[0], p[1]] as LngLat)
  if (!coords || coords.length < 2) return null
  const cum = [0]
  for (let i = 1; i < coords.length; i++) cum.push((cum[i - 1] ?? 0) + haversine(coords[i - 1] as LngLat, coords[i] as LngLat))
  const stopAt: number[] = []
  let from = 0
  for (const s of route.stops) {
    const c = customers.get(s.customerId)
    if (!c) continue
    let best = from
    let bestD = Infinity
    for (let i = from; i < coords.length; i++) {
      const d = haversine(coords[i] as LngLat, [c.lng, c.lat])
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    stopAt.push(cum[best] ?? 0)
    from = best
  }
  return { coords, cum, stopAt }
}

export type Phase = 'before' | 'driving' | 'at-stop' | 'returned'

export interface TrackState {
  distance: number
  point: LngLat
  heading: number
  phase: Phase
  /** Index (0…) du prochain arrêt à servir, ou de l'arrêt en cours. */
  nextStop: number
}

function pointAt(track: RouteTrack, d: number): { point: LngLat; heading: number } {
  const { coords, cum } = track
  const total = cum.at(-1) ?? 0
  const dd = Math.max(0, Math.min(total, d))
  let i = 1
  while (i < cum.length - 1 && (cum[i] ?? 0) < dd) i++
  const a = coords[i - 1] as LngLat
  const b = coords[i] as LngLat
  const seg = (cum[i] ?? 0) - (cum[i - 1] ?? 0)
  const k = seg > 0 ? (dd - (cum[i - 1] ?? 0)) / seg : 0
  return { point: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], heading: bearing(a, b) }
}

/** État du camion à l'heure t (minutes), à partir des horaires du solveur. null si la tournée n'a pas d'horaire. */
export function stateAt(route: Route, track: RouteTrack, t: number): TrackState | null {
  if (route.start === null || route.end === null) return null
  const total = track.cum.at(-1) ?? 0
  // jalons : (heure de départ du point, distance) puis (heure d'arrivée au suivant, distance)
  const nodes: Array<{ dep: number; arr: number; d: number }> = []
  route.stops.forEach((s, i) => nodes.push({ arr: s.arrival ?? NaN, dep: s.departure ?? NaN, d: track.stopAt[i] ?? 0 }))
  if (nodes.some((n) => Number.isNaN(n.arr) || Number.isNaN(n.dep))) return null
  const legs = [{ dep: route.start, d: 0 }, ...nodes.map((n) => ({ dep: n.dep, d: n.d }))]
  const arrivals = [...nodes.map((n) => ({ arr: n.arr, d: n.d })), { arr: route.end, d: total }]
  if (t <= route.start) return { ...pointAt(track, 0), distance: 0, phase: 'before', nextStop: 0 }
  if (t >= route.end) return { ...pointAt(track, total), distance: total, phase: 'returned', nextStop: route.stops.length }
  for (let i = 0; i < arrivals.length; i++) {
    const from = legs[i]
    const to = arrivals[i]
    if (!from || !to) continue
    if (t < to.arr) {
      const k = to.arr > from.dep ? (t - from.dep) / (to.arr - from.dep) : 1
      const d = from.d + (to.d - from.d) * Math.max(0, Math.min(1, k))
      return { ...pointAt(track, d), distance: d, phase: 'driving', nextStop: i }
    }
    const atStop = nodes[i]
    if (atStop && t < atStop.dep) return { ...pointAt(track, atStop.d), distance: atStop.d, phase: 'at-stop', nextStop: i }
  }
  return { ...pointAt(track, total), distance: total, phase: 'returned', nextStop: route.stops.length }
}

/** Découpe le tracé à la distance d : [parcouru, à venir] (le point de coupe appartient aux deux). */
export function splitAt(track: RouteTrack, d: number): [LngLat[], LngLat[]] {
  const { coords, cum } = track
  const cut = pointAt(track, d).point
  const done: LngLat[] = []
  const todo: LngLat[] = []
  coords.forEach((p, i) => ((cum[i] ?? 0) <= d ? done : todo).push(p))
  return [[...done, cut], [cut, ...todo]]
}
