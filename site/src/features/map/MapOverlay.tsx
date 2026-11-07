/**
 * Rôle : éléments posés sur la carte : titre de contexte (grand, léger) et sa ligne de détail (petite, 60 %),
 *   navigation, outils, pastille d'état en bas à gauche, et pour le camion sélectionné : pins, curseur, carte d'info.
 * Marges de 24 px avec les bords (maquette : 24–28 px). Textes toujours sur voile ou sur verre.
 */
import { NavIsland } from '@/components/layout/NavIsland'
import { InfoCard } from '@/features/tours/InfoCard'
import { MapMarkers } from '@/features/tours/MapMarkers'
import { StatusPill } from '@/features/tours/StatusPill'
import { fr } from '@/i18n/fr'
import { useUi } from '@/store/ui'
import { useVrp } from '@/store/vrp'
import { MapToolbar } from './MapToolbar'

export function MapOverlay() {
  const view = useUi((s) => s.view)
  const setView = useUi((s) => s.setView)
  const instance = useVrp((s) => s.instance)
  return (
    <>
      <MapMarkers />
      <div className="pointer-events-none absolute inset-x-6 top-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4 lg:right-16">
        <div className="text-on-dark">
          <p className="text-3xl font-light leading-tight tracking-tight sm:text-4xl">{fr.tours.mapTitle}</p>
          {instance && <p className="mt-1 text-xs text-white/60">{fr.tours.mapSub(instance.id, instance.customers.length, instance.fleet.k)}</p>}
        </div>
        <div className="pointer-events-auto">
          <NavIsland active={view} onChange={setView} />
        </div>
      </div>
      <InfoCard />
      <StatusPill />
      <MapToolbar className="absolute bottom-20 right-6 lg:right-16" />
    </>
  )
}
