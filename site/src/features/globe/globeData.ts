/**
 * Rôle : données géométriques du globe, calculées UNE fois : dépôts fictifs (GeoJSON) et arcs de grand cercle
 *   du dépôt principal vers chaque autre dépôt, plus quelques liaisons entre voisins.
 * Choix retenu : interpolation sphérique (slerp) en 48 points : l'arc suit la courbure du globe.
 * Alternative écartée : segment droit en Mercator (coupe le globe en corde visible à faible zoom).
 */
import type { FeatureCollection, LineString, Point } from 'geojson'
import { DEMO_DEPOTS } from '@/config/globe'

const RAD = Math.PI / 180

/** Points d'un arc de grand cercle entre a et b ([lng, lat] en degrés), extrémités incluses. */
export function greatCircle(a: [number, number], b: [number, number], n = 48): Array<[number, number]> {
  const toVec = ([lng, lat]: [number, number]) => [Math.cos(lat * RAD) * Math.cos(lng * RAD), Math.cos(lat * RAD) * Math.sin(lng * RAD), Math.sin(lat * RAD)] as const
  const p = toVec(a)
  const q = toVec(b)
  const dot = Math.min(1, Math.max(-1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))
  const w = Math.acos(dot)
  if (w < 1e-9) return [a, b]
  const out: Array<[number, number]> = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const k1 = Math.sin((1 - t) * w) / Math.sin(w)
    const k2 = Math.sin(t * w) / Math.sin(w)
    const x = k1 * p[0] + k2 * q[0]
    const y = k1 * p[1] + k2 * q[1]
    const z = k1 * p[2] + k2 * q[2]
    out.push([Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD])
  }
  return out
}

const hub = DEMO_DEPOTS.find((d) => d.hub) ?? DEMO_DEPOTS[0]

export const DEPOTS: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: DEMO_DEPOTS.map((d) => ({ type: 'Feature', properties: { id: d.id, hub: d.hub === true }, geometry: { type: 'Point', coordinates: [d.lng, d.lat] } })),
}

/** Liaisons : dépôt principal → chaque dépôt, et chaque dépôt → son plus proche voisin (hors principal). */
function links(): Array<[[number, number], [number, number]]> {
  const pts = DEMO_DEPOTS.map((d) => [d.lng, d.lat] as [number, number])
  const out: Array<[[number, number], [number, number]]> = []
  if (!hub) return out
  const h: [number, number] = [hub.lng, hub.lat]
  for (const d of DEMO_DEPOTS) if (d !== hub) out.push([h, [d.lng, d.lat]])
  DEMO_DEPOTS.forEach((d, i) => {
    if (d === hub) return
    let best = -1
    let bestD = Infinity
    pts.forEach((p, j) => {
      if (j === i || DEMO_DEPOTS[j] === hub) return
      const dd = Math.hypot(p[0] - d.lng, p[1] - d.lat)
      if (dd < bestD) { bestD = dd; best = j }
    })
    const q = pts[best]
    if (q && best > i) out.push([[d.lng, d.lat], q])
  })
  return out
}

export const ARCS: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: links().map(([a, b]) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: greatCircle(a, b) } })),
}

/** Zoom auquel le globe a le rayon voulu (px) : circonférence du monde = 512 · 2^z px (tuiles de 512). */
export function globeZoom(visibleW: number, visibleH: number, share: number): number {
  const r = share * Math.max(160, Math.min(visibleW, visibleH))
  return Math.log2((2 * Math.PI * r) / 512)
}
