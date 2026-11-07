/**
 * Mesure P4 — le composant Gantt RÉEL (src/features/tours/gantt) reste-t-il fluide à 20 camions × 50 arrêts ?
 * Données synthétiques déterministes (graine fixe), au format du contrat (Route). Mesures : premier rendu,
 * intervalle entre images pendant 300 survols, pendant 20 crans de Ctrl + molette (aperçu par transform),
 * et pendant 10 clics « Zoomer » (re-rendu validé) ; tâches longues > 50 ms.
 */
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import { Gantt } from '@/features/tours/gantt/Gantt'
import { mulberry32, randInt } from '@/lib/random'
import type { Customer, Route } from '@/types/vrp'
import { webglRenderer } from './common'

const rng = mulberry32(7)
const customers = new Map<number, Customer>()
const routes: Route[] = Array.from({ length: 20 }, (_, r) => {
  let t = 480
  const stops = Array.from({ length: 50 }, (_unused, i) => {
    const id = r * 50 + i + 1
    t += randInt(rng, 2, 9)
    const a = t + randInt(rng, -10, 8)
    const wait = Math.max(0, a - t)
    const service = randInt(rng, 2, 6)
    customers.set(id, { id, name: `Client ${id}`, lat: 48.69, lng: 6.18, demand: 1, tw: { a, b: a + 30 }, service })
    const stop = { customerId: id, arrival: t, wait, departure: t + wait + service, late: Math.max(0, t - (a + 30)) }
    t += wait + service
    return stop
  })
  return { vehicleId: r + 1, load: 50, distanceM: null, geometry: null, start: 480, end: t + 10, stops, legs: [] }
})

const frame = () => new Promise<number>((res) => requestAnimationFrame(res))
async function frames(steps: number, act: (i: number) => void) {
  const d: number[] = []
  let last = await frame()
  for (let i = 0; i < steps; i++) {
    act(i)
    const now = await frame()
    d.push(now - last)
    last = now
  }
  const worstAt = d.indexOf(Math.max(...d))
  d.sort((a, b) => a - b)
  return { worstAt, p95FrameMs: Math.round((d[Math.floor(d.length * 0.95)] ?? 0) * 10) / 10, maxFrameMs: Math.round((d.at(-1) ?? 0) * 10) / 10 }
}

async function measure() {
  const longTasks: number[] = []
  new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration))).observe({ type: 'longtask', buffered: true })
  const root = document.getElementById('root')
  if (!root) return
  root.style.width = '560px'
  root.style.padding = '16px'
  const t0 = performance.now()
  createRoot(root).render(<Gantt routes={routes} customers={customers} />)
  await frame(); await frame()
  const mountMs = Math.round(performance.now() - t0)
  const svg = document.querySelector('svg[role="img"]')
  const bars = Array.from(document.querySelectorAll('[data-stop] rect:last-of-type'))
  const hover = await frames(300, (i) => bars[(i * 37) % bars.length]?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 200, clientY: 100 })))
  const wheel = await frames(20, (i) => svg?.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, deltaY: i % 2 ? 100 : -100, clientX: 300 })))
  await new Promise((r) => setTimeout(r, 300))
  const zoomBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Zoomer sur le planning"]')
  const commitZoom = await frames(10, () => zoomBtn?.click())
  window.__spike = {
    spike: 'P4-gantt',
    renderer: webglRenderer(),
    svgElements: document.querySelectorAll('svg[role="img"] *').length,
    mountMs, hover, wheelPreview: wheel, buttonZoom: commitZoom,
    longTasksOver50ms: longTasks.length,
    longestTaskMs: Math.round(Math.max(0, ...longTasks)),
  }
}
void measure()
