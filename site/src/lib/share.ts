/**
 * Rôle : partage d'une tournée, généré LOCALEMENT (ADR-021) : liens d'itinéraire (Google Maps découpé, Waze arrêt
 *   suivant), fichiers GPX / GeoJSON / CSV, noms de fichiers sûrs. Fonctions pures, testées.
 * Choix retenu : aucune bibliothèque (XML et CSV écrits à la main, échappés) ; coordonnées à 6 décimales (≈ 0,1 m).
 * Alternative écartée : service de partage en ligne (enverrait les adresses des clients à un tiers sans action).
 * Question probable du jury : « Google reçoit-il les adresses ? » → seulement si le dispatcher clique sur le lien
 *   après un avertissement explicite ; les fichiers, eux, ne quittent jamais le navigateur.
 */
import { formatHm } from './time'
import type { Customer, Depot, Route } from '@/types/vrp'

export interface SharePoint {
  lat: number
  lng: number
  name: string
  /** Rang de l'arrêt (1…n) ; 0 = dépôt. */
  order: number
  customerId: number | null
  eta: number | null
  tw: { a: number; b: number } | null
  demand: number
  service: number
}

/** Documentation Google Maps URLs (07/11/2026) : 9 étapes intermédiaires au plus, 3 sur navigateur mobile ; 2 048 caractères. */
export const GOOGLE_MAX_WAYPOINTS = 9
export const GOOGLE_MAX_WAYPOINTS_MOBILE = 3
export const GOOGLE_MAX_URL = 2048

export const coord = (v: number): string => v.toFixed(6)

/** Dépôt → arrêts dans l'ordre du solveur → dépôt. */
export function routePoints(route: Route, depot: Depot, customers: ReadonlyMap<number, Customer>): SharePoint[] {
  const d = (order: number): SharePoint => ({ lat: depot.lat, lng: depot.lng, name: depot.name, order, customerId: null, eta: null, tw: null, demand: 0, service: 0 })
  const stops = route.stops.flatMap((s, i) => {
    const c = customers.get(s.customerId)
    return c ? [{ lat: c.lat, lng: c.lng, name: c.name, order: i + 1, customerId: c.id, eta: s.arrival, tw: c.tw, demand: c.demand, service: c.service }] : []
  })
  return [d(0), ...stops, d(0)]
}

/**
 * Itinéraire Google Maps découpé en parties : chaque partie va d'un point au suivant en passant par au plus
 * `maxWaypoints` étapes ; deux parties consécutives partagent leur point de jonction.
 */
export function googleMapsParts(points: SharePoint[], maxWaypoints = GOOGLE_MAX_WAYPOINTS): string[] {
  const urls: string[] = []
  const step = maxWaypoints + 1
  for (let start = 0; start < points.length - 1; start += step) {
    const end = Math.min(start + step, points.length - 1)
    const o = points[start]
    const dst = points[end]
    if (!o || !dst) break
    const q = new URLSearchParams({ api: '1', origin: `${coord(o.lat)},${coord(o.lng)}`, destination: `${coord(dst.lat)},${coord(dst.lng)}`, travelmode: 'driving' })
    const mid = points.slice(start + 1, end)
    if (mid.length) q.set('waypoints', mid.map((p) => `${coord(p.lat)},${coord(p.lng)}`).join('|'))
    urls.push(`https://www.google.com/maps/dir/?${q.toString()}`)
  }
  return urls
}

/** Waze : une seule destination par lien (limite du service) → l'arrêt suivant. */
export function wazeUrl(p: Pick<SharePoint, 'lat' | 'lng'>): string {
  return `https://www.waze.com/ul?${new URLSearchParams({ ll: `${coord(p.lat)},${coord(p.lng)}`, navigate: 'yes' }).toString()}`
}

export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c)
}

/** `cesicdp-camion-3-2026-11-07.gpx` : minuscules, sans accents ni caractères spéciaux. */
export function safeFileName(parts: Array<string | number>, ext: string): string {
  const slug = parts
    .map((p) => String(p).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('-')
  return `${slug || 'cesicdp'}.${ext.replace(/[^a-z0-9]/gi, '').toLowerCase()}`
}

/** Allègement d'une trace : on ne garde un sommet que s'il s'éloigne d'au moins `minM` mètres du précédent gardé. */
export function thinTrack(coords: Array<[number, number]>, minM = 15): Array<[number, number]> {
  if (coords.length <= 2) return coords
  const out: Array<[number, number]> = [coords[0] as [number, number]]
  const m = (a: [number, number], b: [number, number]) => Math.hypot((a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 110540)
  for (let i = 1; i < coords.length - 1; i++) {
    const p = coords[i] as [number, number]
    if (m(p, out[out.length - 1] as [number, number]) >= minM) out.push(p)
  }
  out.push(coords[coords.length - 1] as [number, number])
  return out
}

export interface ShareMeta {
  vehicleId: number
  date: string
  simulated: boolean
}

export function toGpx(points: SharePoint[], track: Array<[number, number]> | null, meta: ShareMeta): string {
  const title = `CesiCDP — Camion ${meta.vehicleId} — ${meta.date}`
  const note = meta.simulated ? 'Résultat simulé (solveur non branché).' : 'Résultat du solveur.'
  const desc = (p: SharePoint) => [p.eta !== null ? `arrivée ${formatHm(p.eta)}` : null, p.tw ? `fenêtre ${formatHm(p.tw.a)}–${formatHm(p.tw.b)}` : null, p.order ? `demande ${p.demand}` : null].filter(Boolean).join(', ')
  const pt = (tag: string, p: SharePoint) =>
    `  <${tag} lat="${coord(p.lat)}" lon="${coord(p.lng)}"><name>${escapeXml(p.order ? `${p.order}. ${p.name}` : p.name)}</name>${desc(p) ? `<desc>${escapeXml(desc(p))}</desc>` : ''}</${tag}>`
  const stops = points.filter((p) => p.order > 0)
  const depot = points[0]
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="CesiCDP" xmlns="http://www.topografix.com/GPX/1/1">',
    `  <metadata><name>${escapeXml(title)}</name><desc>${escapeXml(note)}</desc></metadata>`,
    ...(depot ? [pt('wpt', depot)] : []),
    ...stops.map((p) => pt('wpt', p)),
    `  <rte><name>${escapeXml(title)}</name>`,
    ...points.map((p) => '  ' + pt('rtept', p)),
    '  </rte>',
    ...(track && track.length > 1
      ? [`  <trk><name>${escapeXml(`${title} (trace)`)}</name><trkseg>`, ...thinTrack(track).map(([lng, lat]) => `    <trkpt lat="${coord(lat)}" lon="${coord(lng)}"/>`), '  </trkseg></trk>']
      : []),
    '</gpx>',
    '',
  ].join('\n')
}

export function toGeoJson(points: SharePoint[], track: Array<[number, number]> | null, meta: ShareMeta): string {
  const features: unknown[] = points.slice(0, -1).map((p) => ({
    type: 'Feature',
    properties: { order: p.order, name: p.name, eta: p.eta === null ? null : formatHm(p.eta), demand: p.demand, kind: p.order ? 'stop' : 'depot' },
    geometry: { type: 'Point', coordinates: [Number(coord(p.lng)), Number(coord(p.lat))] },
  }))
  if (track && track.length > 1) features.push({ type: 'Feature', properties: { kind: 'track' }, geometry: { type: 'LineString', coordinates: thinTrack(track).map(([x, y]) => [Number(coord(x)), Number(coord(y))]) } })
  return JSON.stringify({ type: 'FeatureCollection', properties: { vehicleId: meta.vehicleId, date: meta.date, simulated: meta.simulated }, features }, null, 2)
}

const csvCell = (v: string | number): string => {
  const s = String(v)
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV des arrêts (séparateur « ; », tableurs français), charge cumulée incluse. */
export function toCsv(points: SharePoint[], meta: ShareMeta): string {
  let load = 0
  const head = ['ordre', 'client', 'latitude', 'longitude', 'arrivee', 'fenetre_debut', 'fenetre_fin', 'demande', 'charge_cumulee', 'service_min']
  const rows = points
    .filter((p) => p.order > 0)
    .map((p) => {
      load += p.demand
      return [p.order, p.name, coord(p.lat), coord(p.lng), p.eta === null ? '' : formatHm(p.eta), p.tw ? formatHm(p.tw.a) : '', p.tw ? formatHm(p.tw.b) : '', p.demand, load, p.service]
    })
  const note = meta.simulated ? ['# Résultat simulé (solveur non branché)'] : []
  return [...note, head.join(';'), ...rows.map((r) => r.map(csvCell).join(';'))].join('\r\n') + '\r\n'
}
