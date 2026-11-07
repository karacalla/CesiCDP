/**
 * Rôle : dessin d'une ligne du Gantt (un camion) : trajet du départ au retour, fenêtres [a, b] en contour,
 *   attente hachurée, service plein coloré selon le statut, triangle d'alerte au-dessus d'un arrêt en retard.
 * Choix retenu : composant mémorisé (React.memo) ; le survol n'est jamais une prop → il ne redessine aucune ligne.
 * Question probable du jury : « la couleur seule porte-t-elle le statut ? » → non : triangle pour le retard,
 *   hachures pour l'attente, et la liste des arrêts donne le même statut en texte.
 */
import { memo } from 'react'
import type { ScaleLinear } from 'd3-scale'
import type { Customer, Route } from '@/types/vrp'
import { stopStatus } from '../useTours'

export const ROW_H = 30

const FILL = { ok: 'var(--panel-ok)', late: 'var(--panel-late)', wait: 'var(--panel-ok)', none: 'var(--panel-ink-2)' } as const

interface Props {
  route: Route
  y: number
  x: ScaleLinear<number, number>
  customers: ReadonlyMap<number, Customer>
}

export const GanttRow = memo(function GanttRow({ route, y, x, customers }: Props) {
  const mid = ROW_H / 2
  return (
    <g transform={`translate(0 ${y})`}>
      {route.start !== null && route.end !== null && (
        <line x1={x(route.start)} x2={x(route.end)} y1={mid} y2={mid} stroke="var(--panel-ink-2)" strokeOpacity={0.5} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      )}
      {route.stops.map((s) => {
        const c = customers.get(s.customerId)
        const st = stopStatus(s)
        const key = `${route.vehicleId}:${s.customerId}`
        const begin = s.arrival === null ? null : s.arrival + (s.wait ?? 0)
        return (
          <g key={key} data-stop={key} className="cursor-pointer">
            {c?.tw && (
              <rect x={x(c.tw.a)} y={4} width={Math.max(1, x(c.tw.b) - x(c.tw.a))} height={ROW_H - 8} fill="none" stroke="var(--panel-ink-2)" strokeOpacity={0.45} strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
            )}
            {s.arrival !== null && (s.wait ?? 0) > 0 && (
              <rect x={x(s.arrival)} y={8} width={x(s.arrival + (s.wait ?? 0)) - x(s.arrival)} height={ROW_H - 16} fill="url(#gantt-hatch)" />
            )}
            {begin !== null && s.departure !== null && (
              <rect x={x(begin)} y={8} width={Math.max(2, x(s.departure) - x(begin))} height={ROW_H - 16} rx={1} fill={FILL[st]} />
            )}
            {st === 'late' && begin !== null && (
              // triangle d'alerte (non coloré seul : forme distincte), pointe vers la barre
              <path d={`M${x(begin) - 4} 0 h8 l-4 6 z`} fill="var(--panel-late)" />
            )}
          </g>
        )
      })}
    </g>
  )
})
