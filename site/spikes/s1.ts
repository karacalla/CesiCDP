/**
 * Essai S1 — les couches deck.gl (mode entrelacé) suivent-elles le relief MapLibre ?
 * Méthode : un même tracé traversant une vallée vosgienne est dessiné trois fois :
 *   (a) couche native MapLibre (référence : elle épouse le relief),
 *   (b) deck.gl PathLayer à z = 0,
 *   (c) deck.gl PathLayer avec z = map.queryTerrainElevation(point).
 * Mesure : pour chaque sommet, on projette le point avec la carte (projection tenant compte du relief)
 * et on demande à deck.gl quel objet se trouve sous ce pixel. Taux de coïncidence = sommets « touchés ».
 */
import { MapboxOverlay } from '@deck.gl/mapbox'
import { PathLayer } from '@deck.gl/layers'
import { addTerrain, createMap, onceIdle, webglRenderer } from './common'

type P3 = [number, number, number]

const A: [number, number] = [6.835, 48.058]
const B: [number, number] = [6.925, 48.083]
const N = 60
const line: Array<[number, number]> = Array.from({ length: N }, (_, i) => {
  const t = i / (N - 1)
  return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t + Math.sin(t * Math.PI * 3) * 0.004]
})

async function run(): Promise<void> {
  const el = document.getElementById('map')
  if (!el) return
  const map = createMap(el, { center: [6.88, 48.07], zoom: 12.6, pitch: 62, bearing: 25 })
  await new Promise<void>((r) => map.on('load', () => r()))
  addTerrain(map)
  map.addSource('ref', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } } })
  map.addLayer({ id: 'ref', type: 'line', source: 'ref', paint: { 'line-color': '#ffffff', 'line-width': 3, 'line-dasharray': [2, 2] } })
  await onceIdle(map)

  const draped: P3[] = line.map((p) => [p[0], p[1], map.queryTerrainElevation(p) ?? 0])
  const flat: P3[] = line.map((p) => [p[0], p[1], 0])

  const overlay = new MapboxOverlay({ interleaved: true, layers: [] })
  map.addControl(overlay)
  const evaluate = async (id: string, path: P3[], color: [number, number, number]): Promise<number> => {
    overlay.setProps({ layers: [new PathLayer({ id, data: [{ path }], getPath: (d: { path: P3[] }) => d.path, getColor: color, getWidth: 6, widthUnits: 'pixels', pickable: true })] })
    await onceIdle(map)
    map.triggerRepaint()
    await new Promise((r) => setTimeout(r, 600))
    let hits = 0
    for (const p of line) {
      const s = map.project(p)
      if (s.x < 0 || s.y < 0 || s.x > el.clientWidth || s.y > el.clientHeight) continue
      if (overlay.pickObject({ x: s.x, y: s.y, radius: 4 })) hits += 1
    }
    return hits
  }
  const visible = line.filter((p) => {
    const s = map.project(p)
    return s.x >= 0 && s.y >= 0 && s.x <= el.clientWidth && s.y <= el.clientHeight
  }).length
  const hitsFlat = await evaluate('flat', flat, [244, 113, 181])
  const hitsDraped = await evaluate('draped', draped, [245, 158, 11])
  const elevations = draped.map((p) => p[2])

  window.__spike = {
    spike: 'S1',
    renderer: webglRenderer(),
    visibleVertices: visible,
    hitsZ0: hitsFlat,
    hitsQueriedZ: hitsDraped,
    elevationMinM: Math.round(Math.min(...elevations)),
    elevationMaxM: Math.round(Math.max(...elevations)),
    exaggeration: map.getTerrain()?.exaggeration ?? null,
  }
}

void run()
