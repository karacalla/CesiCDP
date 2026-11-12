/**
 * Rôle : pastille en bas à gauche de la carte : camion suivi et distance restante à l'heure affichée.
 */
import { Truck } from 'lucide-react'
import { fr } from '@/i18n/fr'
import { formatHm } from '@/lib/time'
import { formatDistance } from '@/lib/units'
import { useSelection } from '@/store/selection'
import { useTours } from './useTours'

export function StatusPill() {
  const { selected, state, abstractUnits } = useTours()
  const clock = useSelection((s) => s.clock)
  if (!selected?.track || !state) return null
  const total = selected.track.cum.at(-1) ?? 0
  // positions projetées : la longueur affichée n'est pas en km ; on rapporte la part restante à la distance du solveur
  const left = abstractUnits
    ? fr.tours.remainingUnits(formatDistance((selected.route.distanceM ?? 0) * (total ? Math.max(0, total - state.distance) / total : 0), true))
    : fr.tours.remaining((Math.max(0, total - state.distance) / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }))
  return (
    <p className="glass absolute bottom-[calc(var(--sheet-h)_+_24px)] left-5 inline-flex h-9 items-center lg:bottom-6 lg:left-6 panel-collapsed:bottom-6 gap-2 rounded-full px-4 text-sm text-on-dark">
      <Truck size={16} aria-hidden className="text-accent" />
      <span className="font-semibold">{fr.tours.truck(selected.route.vehicleId)}</span>
      <span className="text-white/70">· {left} · {formatHm(clock)}</span>
    </p>
  )
}
