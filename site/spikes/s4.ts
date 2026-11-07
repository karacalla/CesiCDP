/**
 * Essai S4 — globe MapLibre 5.24 : projection globe + atmosphère + imagerie EOX aux zooms 0–6, relief, vol vers
 * l'emprise des tournées (padding du panneau), passage globe → Mercator, images/s, cohabitation avec deck.gl.
 * Paramètre `terrain=globe|end` : relief actif dès le globe, ou seulement à l'arrivée du vol.
 */
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ScatterplotLayer } from '@deck.gl/layers'
import * as maplibregl from 'maplibre-gl'
import { fitBounds } from '@math.gl/web-mercator'
import { BASEMAP } from '@/config/basemap'
import { tuneBasemap } from '@/features/map/basemapStyle'
import { createMap, onceIdle, webglRenderer } from './common'

const params = new URLSearchParams(location.search)
const terrainMode = params.get('terrain') ?? 'globe'
performance.setResourceTimingBufferSize(10000)
const errors: string[] = []
window.addEventListener('error', (e) => errors.push(String(e.message)))
const longTasks: number[] = []
new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration))).observe({ type: 'longtask' })

const NANCY_BOUNDS: [[number, number], [number, number]] = [[6.05, 48.6], [6.32, 48.76]]
const PANEL_W = 540
const frame = () => new Promise<number>((r) => requestAnimationFrame(r))

async function frames(ms: number, step?: (t: number) => void): Promise<{ fps: number; p95FrameMs: number }> {
  const d: number[] = []
  const start = await frame()
  let last = start
  for (;;) {
    const now = await frame()
    d.push(now - last)
    last = now
    step?.(now - start)
    if (now - start >= ms) break
  }
  const s = d.slice().sort((a, b) => a - b)
  return { fps: Math.round((d.length / ms) * 10000) / 10, p95FrameMs: Math.round((s[Math.floor(s.length * 0.95)] ?? 0) * 10) / 10 }
}

function addDem(map: maplibregl.Map) {
  if (!map.getSource('cdp-dem')) map.addSource('cdp-dem', { type: 'raster-dem', tiles: BASEMAP.dem.tiles, encoding: BASEMAP.dem.encoding, tileSize: BASEMAP.dem.tileSize, maxzoom: BASEMAP.dem.maxzoom })
  map.setTerrain({ source: 'cdp-dem', exaggeration: BASEMAP.exaggeration })
}

function transition(map: maplibregl.Map): number | null {
  const p = (map as unknown as { style?: { projection?: { transitionState?: number } } }).style?.projection
  return typeof p?.transitionState === 'number' ? Math.round(p.transitionState * 100) / 100 : null
}

async function run() {
  const el = document.getElementById('map')
  if (!el) return
  const map = createMap(el, { center: [10, 42], zoom: 1.6, pitch: 0 })
  map.on('error', (e) => errors.push(`map: ${String(e.error?.message ?? e.error)}`))
  await new Promise<void>((r) => map.once('load', () => r()))
  map.setProjection({ type: 'globe' })
  tuneBasemap(map)
  map.setSky({ 'sky-color': '#0a1120', 'horizon-color': '#1e293b', 'fog-color': '#0f172a', 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] })
  if (terrainMode === 'globe') addDem(map)
  map.easeTo({ padding: { right: PANEL_W, left: 0, top: 0, bottom: 0 }, duration: 0 })
  // deck.gl en mode entrelacé, sur le globe
  const overlay = new MapboxOverlay({ interleaved: true, layers: [new ScatterplotLayer({ id: 'depots', data: [[6.18, 48.69], [2.35, 48.86], [13.4, 52.52]], getPosition: (d: number[]) => [d[0] ?? 0, d[1] ?? 0], getRadius: 60000, getFillColor: [245, 158, 11], pickable: true })] })
  map.addControl(overlay)
  map.triggerRepaint()
  await onceIdle(map)
  const deckPickGlobe = (() => { const p = map.project([6.18, 48.69]); return overlay.pickObject({ x: p.x, y: p.y, radius: 6 }) !== null })()

  if (params.get('stop') === 'globe') {
    window.__spike = { spike: 'S4-shot', renderer: webglRenderer(), errors }
    return
  }
  const eox = () => performance.getEntriesByType('resource').filter((r) => r.name.includes('tiles.maps.eox.at')) as PerformanceResourceTiming[]
  const eoxZooms = [...new Set(eox().map((r) => Number(/\/g\/(\d+)\//.exec(r.name)?.[1])))].sort((a, b) => a - b)
  const eoxSample = eox().slice(0, 2).map((r) => r.name)
  const eoxFailed = eox().filter((r) => r.responseStatus >= 400).length

  // rotation lente : ≈ 3,5°/s, rendu à chaque image puis plafonné à 30 images/s
  const lng0 = map.getCenter().lng
  const rotateFull = await frames(5000, (t) => map.jumpTo({ center: [lng0 + (t / 1000) * 3.5, 42] }))
  let lastStep = 0
  const rotate30 = await frames(5000, (t) => { if (t - lastStep >= 33) { lastStep = t; map.jumpTo({ center: [lng0 + 17.5 + (t / 1000) * 3.5, 42] }) } })
  await new Promise((r) => setTimeout(r, 1000))
  const idleFps = await frames(2000)

  // vol vers les tournées (4,5 s), padding du panneau
  // cameraForBounds en projection globe (mesure séparée) puis calcul Mercator indépendant (@math.gl/web-mercator)
  const camGlobe = map.cameraForBounds(NANCY_BOUNDS, { padding: { top: 60, bottom: 60, left: 60, right: PANEL_W + 60 } })
  const fit = fitBounds({ width: window.innerWidth - PANEL_W, height: window.innerHeight, bounds: NANCY_BOUNDS, padding: 60 })
  const cam = { center: [fit.longitude, fit.latitude] as [number, number], zoom: fit.zoom, padding: { right: PANEL_W, left: 0, top: 0, bottom: 0 } }
  const ltBefore = longTasks.length
  const t0 = performance.now()
  const samples: Array<{ t: number; zoom: number; transition: number | null }> = []
  map.flyTo({ ...cam, pitch: 20, bearing: -15, duration: 4500, curve: 1.42, easing: (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2) })
  const fly = await frames(4600, (t) => { if (samples.length < Math.floor(t / 500) + 1) samples.push({ t: Math.round(t), zoom: Math.round(map.getZoom() * 10) / 10, transition: transition(map) }) })
  const flyLongTasks = longTasks.slice(ltBefore).map(Math.round)
  if (terrainMode === 'end') addDem(map)
  await onceIdle(map)
  const arrival = { zoom: Math.round(map.getZoom() * 100) / 100, transition: transition(map), ms: Math.round(performance.now() - t0) }
  // centre visible : la zone hors panneau doit contenir le centre des tournées
  const pc = map.project([fit.longitude, fit.latitude])
  const centerPx = { x: Math.round(pc.x), y: Math.round(pc.y), expectedX: Math.round((window.innerWidth - PANEL_W) / 2) }
  // deck.gl après le vol : avec la projection encore déclarée « globe » (GlobeView) puis en Mercator explicite
  const pickAt = () => { const p = map.project([6.18, 48.69]); return overlay.pickObject({ x: p.x, y: p.y, radius: 6 }) !== null }
  const deckPickAfterFlyGlobe = pickAt()
  const transitionAtArrival = transition(map)
  map.setProjection({ type: 'mercator' })
  await onceIdle(map)
  const deckPickAfterMercator = pickAt()

  const eoxZoomsAll = [...new Set(eox().map((r) => Number(/\/g\/(\d+)\//.exec(r.name)?.[1])))].sort((a, b) => a - b)
  window.__spike = {
    spike: 'S4', terrainMode, eoxZoomsAll, renderer: webglRenderer(),
    eoxZooms, eoxSample, eoxRequests: eox().length, eoxFailed,
    deckPickGlobe, deckPickAfterFlyGlobe, deckPickAfterMercator, transitionAtArrival,
    rotateEveryFrame: rotateFull, rotateCapped30: rotate30, idleFps,
    fly, flyLongTasks, samples, arrival, centerPx, cameraForBoundsGlobeZoom: Math.round((camGlobe?.zoom ?? 0) * 100) / 100, fitZoom: Math.round(fit.zoom * 100) / 100,
    errors: errors.slice(0, 10), longestTaskMs: Math.round(Math.max(0, ...longTasks)),
  }
}
void run()
