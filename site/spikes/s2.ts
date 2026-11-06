/**
 * Essai S2 — 1000 clients en couche GPU (deck.gl ScatterplotLayer) tiennent-ils ≥ 45 images/s ?
 * Comparaison avec 1000 marqueurs HTML « verre » (backdrop-filter) pour justifier la règle « DOM ≤ 40 visibles ».
 * Paramètres d'URL : ?n=1000&mode=gpu|dom
 */
import * as maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ScatterplotLayer } from '@deck.gl/layers'
import { mulberry32 } from '@/lib/random'
import { addTerrain, createMap, measureFps, onceIdle, webglRenderer } from './common'

const params = new URLSearchParams(location.search)
const n = Number(params.get('n') ?? 1000)
const modeParam = params.get('mode')
const mode = modeParam === 'dom' || modeParam === 'native' || modeParam === 'overlay' ? modeParam : 'gpu'

async function run(): Promise<void> {
  const el = document.getElementById('map')
  if (!el) return
  const rng = mulberry32(42)
  const pts: Array<[number, number]> = Array.from({ length: n }, () => [6.05 + rng() * 0.5, 48.55 + rng() * 0.3])
  const map = createMap(el, { center: [6.3, 48.7], zoom: 9.6, pitch: 30 })
  await new Promise<void>((r) => map.on('load', () => r()))
  addTerrain(map)
  await onceIdle(map)

  if (mode === 'gpu') {
    // S1 : deck.gl ne suit pas le relief → altitude explicite par point
    const pts3 = pts.map((p) => [p[0], p[1], map.queryTerrainElevation(p) ?? 0] as [number, number, number])
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [new ScatterplotLayer({ id: 'pts', data: pts3, getPosition: (d: [number, number, number]) => d, getRadius: 5, radiusUnits: 'pixels', getFillColor: [255, 255, 255, 200], getLineColor: [15, 23, 42], lineWidthMinPixels: 1, stroked: true, pickable: true })],
    })
    map.addControl(overlay)
  } else if (mode === 'native') {
    // couche native MapLibre : GPU, drapée sur le relief, regroupement intégré
    map.addSource('pts', {
      type: 'geojson',
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 40,
      data: { type: 'FeatureCollection', features: pts.map((p, i) => ({ type: 'Feature', id: i, properties: {}, geometry: { type: 'Point', coordinates: p } })) },
    })
    map.addLayer({ id: 'clusters', type: 'circle', source: 'pts', filter: ['has', 'point_count'], paint: { 'circle-radius': 14, 'circle-color': '#1e293b', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } })
    map.addLayer({ id: 'pts', type: 'circle', source: 'pts', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': '#0f172a', 'circle-stroke-width': 1 } })
  } else if (mode === 'overlay') {
    // éléments « verre » positionnés par notre code (map.project à chaque rendu), sans maplibregl.Marker
    const els = pts.map(() => {
      const m = document.createElement('div')
      m.style.cssText = 'position:absolute;left:0;top:0;width:22px;height:22px;margin:-11px;border-radius:999px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.45);backdrop-filter:blur(24px);pointer-events:none;will-change:transform'
      el.appendChild(m)
      return m
    })
    map.on('render', () => {
      pts.forEach((p, i) => {
        const s = map.project(p)
        const m = els[i]
        if (m) m.style.transform = `translate(${s.x}px, ${s.y}px)`
      })
    })
  } else {
    for (const p of pts) {
      const m = document.createElement('div')
      m.style.cssText = 'width:22px;height:22px;border-radius:999px;border:1px solid rgba(255,255,255,.15);' + (params.get('blur') === '0' ? 'background:rgba(15,23,42,.85)' : 'background:rgba(0,0,0,.45);backdrop-filter:blur(24px)')
      new maplibregl.Marker({ element: m }).setLngLat(p).addTo(map)
    }
  }
  const idle = onceIdle(map)
  map.triggerRepaint()
  await idle
  const { fps, p95FrameMs } = await measureFps(map, 5000)
  window.__spike = { spike: 'S2', renderer: webglRenderer(), mode, n, fps, p95FrameMs }
}

void run()
