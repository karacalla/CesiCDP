/**
 * Rôle : carte d'une tournée, sombre et neutre, avec la texture discrète d'un plan de rues à gauche et un coin
 *   supérieur droit découpé (onglet). Ligne ambre très fine avec le camion au centre, distance en pastille centrée,
 *   heures petites et grises, durée en gras. Toute la carte est un bouton (sélection du camion).
 */
import { Truck } from 'lucide-react'
import { fr } from '@/i18n/fr'
import { formatDuration, formatHm } from '@/lib/time'
import type { Route } from '@/types/vrp'

/** Texture « plan de rues » (tracé fixe, décoratif). */
function Streets() {
  return (
    <svg aria-hidden viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-y-0 left-0 h-full w-2/5 opacity-[0.15] [mask:linear-gradient(90deg,#000,transparent)]">
      <g stroke="#ffffff" fill="none" strokeLinecap="round">
        <path d="M-5 18 L60 28 L125 20" strokeWidth={3} />
        <path d="M-5 62 L40 58 L80 70 L125 64" strokeWidth={2} />
        <path d="M-5 100 L50 96 L125 108" strokeWidth={3} />
        <path d="M22 -5 L30 50 L18 125" strokeWidth={2} />
        <path d="M70 -5 L64 60 L76 125" strokeWidth={1.5} />
        <path d="M104 -5 L98 40 L110 125" strokeWidth={1.5} />
        <path d="M30 50 L64 60 M40 58 L52 96" strokeWidth={1} />
      </g>
    </svg>
  )
}

interface Props {
  route: Route
  Q: number
  selected: boolean
  onSelect: () => void
  className?: string
}

export function JourneyCard({ route, Q, selected, onSelect, className = '' }: Props) {
  const km = route.distanceM === null ? '—' : `${(route.distanceM / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`
  const timed = route.start !== null && route.end !== null
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative w-full overflow-hidden rounded-journey bg-journey p-4 text-left text-on-dark shadow-[0_18px_36px_-18px_rgb(2_6_23/0.75)] transition-transform [mask:radial-gradient(circle_18px_at_100%_0,transparent_17px,#000_18px)] hover:-translate-y-0.5 ${
        selected ? 'outline-2 -outline-offset-2 outline-accent' : ''
      } ${className}`}
    >
      <Streets />
      <div className="relative flex items-baseline justify-between gap-3 pr-6">
        {/* nom accessible = texte visible (WCAG 2.5.3), précédé d'un verbe pour le lecteur d'écran */}
        <span className="text-sm font-semibold"><span className="sr-only">Afficher le </span>{fr.tours.truck(route.vehicleId)}</span>
        <span className="text-xs text-muted-text-aa">
          {fr.tours.stops(route.stops.length)} · {Math.round((100 * route.load) / Q)} %
        </span>
      </div>
      <div className="relative my-3 flex items-center">
        <span aria-hidden className="size-2 rounded-full bg-on-dark" />
        <span aria-hidden className={`h-px flex-1 ${selected ? 'bg-accent' : 'bg-white/40'}`} />
        <span aria-hidden className={`grid size-6 place-items-center rounded-full ${selected ? 'bg-accent text-on-accent' : 'bg-muted-bg text-on-dark'}`}>
          <Truck size={13} />
        </span>
        <span aria-hidden className={`h-px flex-1 ${selected ? 'bg-accent' : 'bg-white/40'}`} />
        <span aria-hidden className="size-2 rounded-full border border-on-dark" />
      </div>
      <div className="relative grid grid-cols-3 items-center text-xs">
        <span className="text-muted-text-aa tabular-nums">{timed ? formatHm(route.start ?? 0) : '—'}</span>
        <span className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold tabular-nums">{timed ? formatDuration((route.end ?? 0) - (route.start ?? 0)) : '—'}</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 tabular-nums text-on-dark">{km}</span>
        </span>
        <span className="text-right text-muted-text-aa tabular-nums">{timed ? formatHm(route.end ?? 0) : '—'}</span>
      </div>
    </button>
  )
}
