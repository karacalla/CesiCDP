import { describe, expect, it } from 'vitest'
import { escapeXml, googleMapsParts, routePoints, safeFileName, thinTrack, toCsv, toGeoJson, toGpx, wazeUrl, GOOGLE_MAX_URL } from './share'
import type { Customer, Depot, Route } from '@/types/vrp'

const depot: Depot = { name: 'Dépôt fictif — Nancy', lat: 48.6862, lng: 6.2045, tw: { a: 420, b: 1140 } }
const customers = new Map<number, Customer>(
  Array.from({ length: 25 }, (_v, i) => {
    const id = i + 1
    return [id, { id, name: id === 3 ? 'Client <3> & "Fils"' : `Client ${id}`, lat: 48.6 + i / 1000, lng: 6.1 + i / 1000, demand: 2, tw: { a: 480, b: 600 }, service: 5 }] as const
  }),
)
const route: Route = {
  vehicleId: 3, load: 50, distanceM: 1000, geometry: null, start: 450, end: 900, legs: [],
  stops: Array.from({ length: 25 }, (_v, i) => ({ customerId: i + 1, arrival: 480 + i * 10, wait: 0, departure: 485 + i * 10, late: 0 })),
}
const pts = routePoints(route, depot, customers)
const meta = { vehicleId: 3, date: '2026-11-07', simulated: true }

describe('partage : liens', () => {
  it('points : dépôt, arrêts dans l’ordre du solveur, dépôt', () => {
    expect(pts).toHaveLength(27)
    expect(pts[0]?.order).toBe(0)
    expect(pts[1]?.customerId).toBe(1)
    expect(pts.at(-1)?.name).toBe(depot.name)
  })
  it('Google Maps : parties de 9 étapes au plus, jonctions partagées, encodage , → %2C et | → %7C', () => {
    const urls = googleMapsParts(pts)
    expect(urls).toHaveLength(3) // 27 points → 26 tronçons → parties de 10 tronçons
    for (const u of urls) {
      const q = new URL(u).searchParams
      expect((q.get('waypoints') ?? '').split('|').filter(Boolean).length).toBeLessThanOrEqual(9)
      expect(u.length).toBeLessThanOrEqual(GOOGLE_MAX_URL)
      expect(u).toContain('%2C')
      expect(q.get('travelmode')).toBe('driving')
    }
    expect(urls[0]).toContain('%7C')
    const end1 = new URL(urls[0] ?? '').searchParams.get('destination')
    const start2 = new URL(urls[1] ?? '').searchParams.get('origin')
    expect(end1).toBe(start2)
    expect(new URL(urls[2] ?? '').searchParams.get('destination')).toBe(`${depot.lat.toFixed(6)},${depot.lng.toFixed(6)}`)
  })
  it('Google Maps mobile : 3 étapes au plus par partie', () => {
    const urls = googleMapsParts(pts, 3)
    expect(urls.length).toBe(Math.ceil(26 / 4))
    for (const u of urls) expect((new URL(u).searchParams.get('waypoints') ?? '').split('|').filter(Boolean).length).toBeLessThanOrEqual(3)
  })
  it('Waze : une destination, 6 décimales', () => {
    expect(wazeUrl({ lat: 48.1234567, lng: 6.7654321 })).toBe('https://www.waze.com/ul?ll=48.123457%2C6.765432&navigate=yes')
  })
})

describe('partage : fichiers', () => {
  it('échappement XML', () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;')
  })
  it('noms de fichiers assainis', () => {
    expect(safeFileName(['cesicdp', 'Camion', 3, '2026-11-07'], 'gpx')).toBe('cesicdp-camion-3-2026-11-07.gpx')
    expect(safeFileName(['Été/../é<>'], '.GPX')).toBe('ete-e.gpx')
  })
  it('GPX bien formé (DOMParser), noms échappés, ordre et mention « simulé »', () => {
    const xml = toGpx(pts, [[6.1, 48.6], [6.2, 48.7]], meta)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
    expect(doc.getElementsByTagName('rtept')).toHaveLength(27)
    expect(doc.getElementsByTagName('wpt')).toHaveLength(26)
    expect(doc.getElementsByTagName('trkpt').length).toBeGreaterThanOrEqual(2)
    const names = Array.from(doc.getElementsByTagName('rtept')).map((n) => n.getElementsByTagName('name')[0]?.textContent)
    expect(names[3]).toBe('3. Client <3> & "Fils"')
    expect(doc.getElementsByTagName('metadata')[0]?.textContent).toContain('Résultat simulé')
  })
  it('GeoJSON : dépôt + arrêts + trace', () => {
    const g = JSON.parse(toGeoJson(pts, [[6.1, 48.6], [6.2, 48.7]], meta)) as { features: unknown[]; properties: { simulated: boolean } }
    expect(g.features).toHaveLength(27)
    expect(g.properties.simulated).toBe(true)
  })
  it('CSV : « ; », guillemets échappés, charge cumulée', () => {
    const csv = toCsv(pts, meta).split('\r\n')
    expect(csv[0]).toContain('simulé')
    expect(csv[1]?.split(';')).toHaveLength(10)
    expect(csv[4]).toContain('"Client <3> & ""Fils"""')
    expect(csv[26]?.split(';')[8]).toBe('50')
  })
  it('trace allégée : extrémités conservées, sommets trop proches retirés', () => {
    const t: Array<[number, number]> = [[6, 48], [6.00001, 48], [6.00002, 48], [6.01, 48]]
    expect(thinTrack(t)).toEqual([[6, 48], [6.01, 48]])
  })
})

