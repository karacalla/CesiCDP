/**
 * Essai S3 — un Gantt SVG maison (d3-scale) de 20 camions × 50 arrêts reste-t-il fluide ?
 * Mesures : durée du premier rendu, durée React (Profiler) de chaque mise à jour au survol (300 survols)
 * et au zoom de l'axe des temps (20 pas), nombre de tâches longues (> 50 ms) du navigateur.
 * Principe testé pour P4 : lignes mémorisées (React.memo), survol géré par délégation d'événements
 * sur le <svg>, info-bulle dans un composant séparé → le survol ne redessine pas les 1000 barres.
 */
import { memo, Profiler, useCallback, useMemo, useState, type ProfilerOnRenderCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { scaleLinear, type ScaleLinear } from 'd3-scale'
import { mulberry32, randInt } from '@/lib/random'
import { webglRenderer } from './common'

interface Stop { id: number; arrival: number; wait: number; service: number; a: number; b: number; late: boolean }
interface Row { truck: number; stops: Stop[] }

const ROWS = 20
const STOPS = 50
const ROW_H = 28
const LABEL_W = 96

function makeData(): Row[] {
  const rng = mulberry32(7)
  return Array.from({ length: ROWS }, (_, r) => {
    let t = 480
    const stops: Stop[] = []
    for (let i = 0; i < STOPS; i++) {
      t += randInt(rng, 2, 9)
      const a = t + randInt(rng, -10, 8)
      const wait = Math.max(0, a - t)
      const service = randInt(rng, 2, 6)
      stops.push({ id: r * STOPS + i, arrival: t, wait, service, a, b: a + 30, late: t > a + 30 })
      t += wait + service
    }
    return { truck: r + 1, stops }
  })
}

const RowView = memo(function RowView({ row, y, x }: { row: Row; y: number; x: ScaleLinear<number, number> }) {
  return (
    <g transform={`translate(0 ${y})`}>
      {row.stops.map((s) => (
        <g key={s.id} data-stop={s.id}>
          <rect x={x(s.a)} y={3} width={x(s.b) - x(s.a)} height={ROW_H - 6} fill="none" stroke="rgba(255,255,255,.18)" vectorEffect="non-scaling-stroke" />
          {s.wait > 0 && <rect x={x(s.arrival)} y={8} width={x(s.arrival + s.wait) - x(s.arrival)} height={ROW_H - 16} fill="url(#hatch)" />}
          <rect x={x(s.arrival + s.wait)} y={8} width={Math.max(1, x(s.arrival + s.wait + s.service) - x(s.arrival + s.wait))} height={ROW_H - 16} fill={s.late ? '#f471b5' : '#34d399'} />
        </g>
      ))}
    </g>
  )
})

const commits: Array<{ phase: string; ms: number }> = []
let phase = 'mount'
const onRender: ProfilerOnRenderCallback = (_id, _p, actual) => commits.push({ phase, ms: actual })

function Gantt({ rows }: { rows: Row[] }) {
  const [zoom, setZoom] = useState(1)
  const [hover, setHover] = useState<Stop | null>(null)
  const width = 1200
  const x = useMemo(() => scaleLinear().domain([480, 480 + 600 / zoom]).range([LABEL_W, width]), [zoom])
  const index = useMemo(() => new Map(rows.flatMap((r) => r.stops.map((s) => [s.id, s] as const))), [rows])
  const onMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const g = (e.target as Element).closest('[data-stop]')
    const id = g ? Number(g.getAttribute('data-stop')) : NaN
    setHover(Number.isNaN(id) ? null : (index.get(id) ?? null))
  }, [index])
  return (
    <div>
      <button id="zoom" onClick={() => setZoom((z) => (z >= 4 ? 1 : z * 1.25))}>zoom</button>
      <svg id="gantt" width={width} height={ROWS * ROW_H} onPointerMove={onMove} role="img" aria-label="Essai de Gantt">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#3abdf8" strokeWidth="2" />
          </pattern>
          <clipPath id="clip"><rect x={LABEL_W} y={0} width={width - LABEL_W} height={ROWS * ROW_H} /></clipPath>
        </defs>
        {rows.map((r, i) => <text key={r.truck} x={8} y={i * ROW_H + ROW_H / 2 + 4} fill="#9aa4b2" fontSize={12}>Camion {r.truck}</text>)}
        <g clipPath="url(#clip)">
          <g id="zoomable">{rows.map((r, i) => <RowView key={r.truck} row={r} y={i * ROW_H} x={x} />)}</g>
        </g>
      </svg>
      <p id="tip" style={{ color: '#fff' }}>{hover ? `Arrêt ${hover.id} : arrivée ${hover.arrival}` : '—'}</p>
    </div>
  )
}

async function measure(): Promise<void> {
  const longTasks: number[] = []
  new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration))).observe({ type: 'longtask', buffered: true })
  const t0 = performance.now()
  const root = document.getElementById('root')
  if (!root) return
  createRoot(root).render(<Profiler id="gantt" onRender={onRender}><Gantt rows={makeData()} /></Profiler>)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const mountMs = performance.now() - t0
  const frame = () => new Promise<number>((r) => requestAnimationFrame(r))
  phase = 'hover'
  const bars = Array.from(document.querySelectorAll('#gantt [data-stop] rect:last-child'))
  for (let i = 0; i < 300; i++) {
    const b = bars[(i * 37) % bars.length]
    b?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
    await frame()
  }
  // temps entre deux images consécutives du navigateur (inclut la peinture, pas seulement React)
  const frameTimes = async (steps: number, act: (i: number) => void): Promise<{ p95FrameMs: number; maxFrameMs: number }> => {
    const d: number[] = []
    let last = await frame()
    for (let i = 0; i < steps; i++) {
      act(i)
      const now = await frame()
      d.push(now - last)
      last = now
    }
    d.sort((a, b) => a - b)
    return { p95FrameMs: Math.round((d[Math.floor(d.length * 0.95)] ?? 0) * 10) / 10, maxFrameMs: Math.round((d.at(-1) ?? 0) * 10) / 10 }
  }
  phase = 'zoom'
  const zoomReact = await frameTimes(20, () => document.getElementById('zoom')?.click())
  const g = document.getElementById('zoomable')
  const zoomTransform = await frameTimes(20, (i) => {
    const k = 1.25 ** ((i % 7) + 1)
    g?.setAttribute('transform', `translate(${LABEL_W} 0) scale(${k} 1) translate(${-LABEL_W} 0)`)
  })
  const stats = (p: string) => {
    const v = commits.filter((c) => c.phase === p).map((c) => c.ms).sort((a, b) => a - b)
    return { commits: v.length, p95Ms: Math.round((v[Math.floor(v.length * 0.95)] ?? 0) * 10) / 10, maxMs: Math.round((v.at(-1) ?? 0) * 10) / 10 }
  }
  window.__spike = {
    spike: 'S3',
    renderer: webglRenderer(),
    svgElements: document.querySelectorAll('#gantt *').length,
    mountMs: Math.round(mountMs),
    hover: stats('hover'),
    zoomReactRerender: { ...stats('zoom'), ...zoomReact },
    zoomSvgTransform: zoomTransform,
    longTasksOver50ms: longTasks.length,
    longestTaskMs: Math.round(Math.max(0, ...longTasks)),
  }
}

void measure()
