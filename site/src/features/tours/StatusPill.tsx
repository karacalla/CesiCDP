/**
 * Rôle : pastille en bas à gauche de la carte : camion suivi et distance restante à l'heure affichée.
 */
import { Truck } from 'lucide-react'
import { fr } from '@/i18n/fr'
import { formatHm } from '@/lib/time'
import { useSelection } from '@/store/selection'
import { useTours } from './useTours'

export function StatusPill() {
  const { selected, state } = useTours()
  const clock = useSelection((s) => s.clock)
  if (!selected?.track || !state) return null
  const left = Math.max(0, (selected.track.cum.at(-1) ?? 0) - state.distance) / 1000
  return (
    <p className="glass absolute bottom-[calc(var(--sheet-h)_+_24px)] left-5 inline-flex h-9 items-center lg:bottom-6 lg:left-6 panel-collapsed:bottom-6 gap-2 rounded-full px-4 text-sm text-on-dark">
      <Truck size={16} aria-hidden className="text-accent" />
      <span className="font-semibold">{fr.tours.truck(selected.route.vehicleId)}</span>
      <span className="text-white/70">· {fr.tours.remaining(left.toLocaleString('fr-FR', { maximumFractionDigits: 1 }))} · {formatHm(clock)}</span>
    </p>
  )
}
