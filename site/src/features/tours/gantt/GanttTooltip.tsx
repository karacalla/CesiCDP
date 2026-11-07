/**
 * Rôle : info-bulle du Gantt (arrêt survolé) : nom, ordre, arrivée, fenêtre, attente, service, statut en icône + texte.
 *   Composant séparé : le survol ne redessine que lui (les lignes du Gantt sont mémorisées).
 */
import { AlertTriangle, CheckCircle2, Clock3, MapPin } from 'lucide-react'
import { fr } from '@/i18n/fr'
import { formatHm } from '@/lib/time'
import type { Customer, Route, Stop } from '@/types/vrp'
import { stopStatus } from '../useTours'

export interface Hover {
  stop: { route: Route; stop: Stop; order: number }
  x: number
  y: number
}

const TIP_W = 220

export function GanttTooltip({ hover, customers, width }: { hover: Hover; customers: ReadonlyMap<number, Customer>; width: number }) {
  const { route, stop, order } = hover.stop
  const c = customers.get(stop.customerId)
  const st = stopStatus(stop)
  const Icon = st === 'late' ? AlertTriangle : st === 'wait' ? Clock3 : st === 'ok' ? CheckCircle2 : MapPin
  const cls = st === 'late' ? 'text-panel-late' : st === 'wait' ? 'text-panel-wait' : st === 'ok' ? 'text-panel-ok' : 'text-panel-ink-2'
  const label = st === 'late' ? fr.tours.status.late(Math.round(stop.late ?? 0)) : st === 'wait' ? fr.tours.status.wait(Math.round(stop.wait ?? 0)) : st === 'ok' ? fr.tours.status.ok : fr.tours.status.none
  const begin = stop.arrival === null ? null : stop.arrival + (stop.wait ?? 0)
  const left = Math.min(Math.max(8, hover.x + 12), width - TIP_W - 8)
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 rounded-xl border border-panel-line bg-panel px-3 py-2 text-xs text-panel-ink shadow-[var(--shadow-float)]"
      style={{ left, top: hover.y + 14, width: TIP_W }}
    >
      <p className="font-semibold">{fr.tours.truck(route.vehicleId)} · {fr.tours.gantt.order(order)}</p>
      <p className="truncate">{c?.name ?? `Client ${stop.customerId}`}</p>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 tabular-nums text-panel-ink-2">
        <dt>{fr.tours.arrival}</dt><dd className="text-panel-ink">{stop.arrival === null ? '—' : formatHm(stop.arrival)}</dd>
        <dt>{fr.tours.window}</dt><dd className="text-panel-ink">{c?.tw ? `${formatHm(c.tw.a)}–${formatHm(c.tw.b)}` : fr.tours.gantt.noWindow}</dd>
        <dt>{fr.tours.gantt.service}</dt><dd className="text-panel-ink">{begin === null || stop.departure === null ? '—' : `${formatHm(begin)}–${formatHm(stop.departure)}`}</dd>
      </dl>
      <p className={`mt-1 inline-flex items-center gap-1 font-medium ${cls}`}><Icon size={14} aria-hidden /> {label}</p>
    </div>
  )
}
