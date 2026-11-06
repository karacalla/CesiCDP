/**
 * Outils communs aux essais S1–S3 (phase 0). Code jetable : seules les mesures sont conservées dans le dossier.
 */
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { BASEMAP } from '@/config/basemap'


export interface SpikeResult {
  spike: string
  renderer: string
  [key: string]: unknown
}

declare global {
  interface Window {
    __spike?: SpikeResult
  }
}

/** Nom du moteur WebGL réellement utilisé (GPU matériel ou rendu logiciel). */
export function webglRenderer(): string {
  const gl = document.createElement('canvas').getContext('webgl2')
  if (!gl) return 'webgl2 indisponible'
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
}

export function createMap(container: HTMLElement, opts: Partial<maplibregl.MapOptions>): maplibregl.Map {
  return new maplibregl.Map({
    container,
    style: BASEMAP.styleUrl,
    attributionControl: { compact: true },
    canvasContextAttributes: { antialias: true },
    ...opts,
  })
}

export function addTerrain(map: maplibregl.Map): void {
  map.addSource('dem', {
    type: 'raster-dem',
    tiles: BASEMAP.dem.tiles,
    encoding: BASEMAP.dem.encoding,
    tileSize: BASEMAP.dem.tileSize,
    maxzoom: BASEMAP.dem.maxzoom,
    attribution: BASEMAP.dem.attribution,
  })
  map.setTerrain({ source: 'dem', exaggeration: BASEMAP.exaggeration })
}

export function onceIdle(map: maplibregl.Map): Promise<void> {
  return new Promise((resolve) => map.once('idle', () => resolve()))
}

/**
 * Compte les images du navigateur (rAF) pendant `ms` millisecondes, la caméra tournant en continu.
 * On mesure les images du navigateur et non les rendus WebGL : le coût des marqueurs HTML est dans la composition DOM.
 */
export async function measureFps(map: maplibregl.Map, ms: number): Promise<{ fps: number; p95FrameMs: number }> {
  const frames: number[] = []
  const start = performance.now()
  let last = start
  await new Promise<void>((resolve) => {
    const step = (now: number): void => {
      frames.push(now - last)
      last = now
      const t = now - start
      map.jumpTo({ bearing: (t / 1000) * 30 })
      if (t < ms) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
  const sorted = frames.slice(1).sort((a, b) => a - b)
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
  return { fps: Math.round((frames.length / ms) * 1000 * 10) / 10, p95FrameMs: Math.round(p95 * 10) / 10 }
}
