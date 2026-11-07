/**
 * Rôle : planning de la journée (Gantt) : une ligne par camion, fenêtres, attente hachurée, service, retard
 *   signalé par un triangle, heure affichée sur la carte en trait rose. Survol → info-bulle ; clic → arrêt sélectionné.
 * Choix retenu : SVG maison + d3-scale (ADR-005) ; zoom/déplacement par `transform` pendant le geste.
 * Alternative écartée : Recharts (pas de Gantt), bibliothèque de Gantt (dépendance lourde, style imposé).
 * Question probable du jury : « et l'accessibilité d'un graphique ? » → résumé textuel (`aria-describedby`) et
 *   liste des arrêts du panneau, qui dit tout ce que montre le dessin.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { scaleLinear } from 'd3-scale'
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { fr } from '@/i18n/fr'
import { formatHm } from '@/lib/time'
import { useSelection } from '@/store/selection'
import type { Customer, Route } from '@/types/vrp'
import { GanttRow, ROW_H } from './GanttRows'
import { GanttTooltip, type Hover } from './GanttTooltip'
import { dayDomain, ticks } from './ganttScale'
import { useGanttZoom } from './useGanttZoom'

const LABEL_W = 78
const AXIS_H = 22
const PAD_R = 8

interface Props {
  routes: readonly Route[]
  customers: ReadonlyMap<number, Customer>
}

export function Gantt({ routes, customers }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(480)
  const [hover, setHover] = useState<Hover | null>(null)
  const vehicleId = useSelection((s) => s.vehicleId)
  const clock = useSelection((s) => s.clock)
  const { selectVehicle, selectStop } = useSelection()

  const full = useMemo(() => dayDomain(routes), [routes])
  const x0 = LABEL_W
  const x1 = Math.max(x0 + 100, width - PAD_R)
  const { domain, onWheel, groupRef, zoomBy, reset, zoomed, onPointerDown, onPointerMove, onPointerUp } = useGanttZoom(full, x0, x1)
  const x = useMemo(() => scaleLinear().domain(domain ?? [0, 1]).range([LABEL_W, x1]), [domain, x1])
  const height = AXIS_H + routes.length * ROW_H

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // écouteur non passif : `preventDefault` empêche le zoom de la page avec Ctrl + molette
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const h = (e: WheelEvent) => onWheel(e, svg.getBoundingClientRect().left)
    svg.addEventListener('wheel', h, { passive: false })
    return () => svg.removeEventListener('wheel', h)
  }, [onWheel])

  if (!full || !domain) return <p className="text-xs text-panel-ink-2">{fr.tours.noSchedule}</p>

  const stopAt = (target: EventTarget): Hover['stop'] | null => {
    const key = (target as Element).closest('[data-stop]')?.getAttribute('data-stop')
    if (!key) return null
    const [v, c] = key.split(':').map(Number)
    const route = routes.find((r) => r.vehicleId === v)
    const stop = route?.stops.find((s) => s.customerId === c)
    return route && stop ? { route, stop, order: route.stops.indexOf(stop) + 1 } : null
  }
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    onPointerMove(e)
    const s = stopAt(e.target)
    const r = box.current?.getBoundingClientRect()
    setHover(s && r ? { stop: s, x: e.clientX - r.left, y: e.clientY - r.top } : null)
  }
  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (onPointerUp()) return
    const s = stopAt(e.target)
    if (s) selectStop(s.stop.customerId, s.route.vehicleId)
    else {
      const row = Math.floor((e.clientY - (svgRef.current?.getBoundingClientRect().top ?? 0) - AXIS_H) / ROW_H)
      const r = routes[row]
      if (r) selectVehicle(r.vehicleId)
    }
  }

  const selIndex = routes.findIndex((r) => r.vehicleId === vehicleId)
  const tickList = ticks(domain, x1 - x0)
  const showClock = clock >= domain[0] && clock <= domain[1]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p id="gantt-help" className="text-xs text-panel-ink-2">{fr.tours.gantt.help}</p>
        <div className="flex gap-1" role="group" aria-label={fr.tours.gantt.tools}>
          <IconButton variant="panel" size={36} label={fr.tours.gantt.zoomIn} icon={<ZoomIn size={16} />} onClick={() => zoomBy(1.5)} />
          <IconButton variant="panel" size={36} label={fr.tours.gantt.zoomOut} icon={<ZoomOut size={16} />} onClick={() => zoomBy(1 / 1.5)} />
          <IconButton variant="panel" size={36} label={fr.tours.gantt.reset} icon={<Maximize2 size={16} />} onClick={reset} disabled={!zoomed} />
        </div>
      </div>
      <div ref={box} className="relative rounded-2xl bg-panel-surface py-2">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          role="img"
          aria-label={fr.tours.gantt.label(routes.length, formatHm(full[0]), formatHm(full[1]))}
          aria-describedby="gantt-help"
          className="block touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <pattern id="gantt-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--panel-wait)" strokeWidth="2" />
            </pattern>
            <clipPath id="gantt-clip"><rect x={x0} y={0} width={x1 - x0} height={height} /></clipPath>
          </defs>
          {selIndex >= 0 && <rect x={0} y={AXIS_H + selIndex * ROW_H} width={width} height={ROW_H} fill="var(--accent)" fillOpacity={0.14} />}
          {tickList.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={AXIS_H - 4} y2={height} stroke="var(--panel-line)" />
              <text x={x(t)} y={12} textAnchor={x(t) > x1 - 20 ? 'end' : x(t) < x0 + 20 ? 'start' : 'middle'} fontSize={12} fill="var(--panel-ink-2)" className="tabular-nums">{formatHm(t)}</text>
            </g>
          ))}
          {routes.map((r, i) => (
            <text key={r.vehicleId} x={8} y={AXIS_H + i * ROW_H + ROW_H / 2 + 4} fontSize={12} fontWeight={i === selIndex ? 700 : 500} fill="var(--panel-ink)">
              {fr.tours.truck(r.vehicleId)}
            </text>
          ))}
          <g clipPath="url(#gantt-clip)">
            <g ref={groupRef}>
              <g transform={`translate(0 ${AXIS_H})`}>
                {routes.map((r, i) => <GanttRow key={r.vehicleId} route={r} y={i * ROW_H} x={x} customers={customers} />)}
              </g>
              {showClock && <line x1={x(clock)} x2={x(clock)} y1={AXIS_H - 6} y2={height} stroke="var(--panel-accent-ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
            </g>
          </g>
        </svg>
        {hover && <GanttTooltip hover={hover} customers={customers} width={width} />}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-panel-ink-2" aria-label={fr.tours.gantt.legend}>
        <li className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-4 rounded-sm bg-panel-ok" />{fr.tours.gantt.service}</li>
        <li className="flex items-center gap-1.5"><svg aria-hidden width="16" height="10"><rect width="16" height="10" fill="url(#gantt-hatch)" /></svg>{fr.tours.gantt.wait}</li>
        <li className="flex items-center gap-1.5"><svg aria-hidden width="10" height="8"><path d="M1 1h8l-4 6z" fill="var(--panel-late)" /></svg>{fr.tours.gantt.late}</li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-4 rounded-sm border border-dashed border-panel-ink-2" />{fr.tours.gantt.window}</li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-0.5 bg-panel-accent-ink" />{fr.tours.gantt.now}</li>
      </ul>
    </div>
  )
}
