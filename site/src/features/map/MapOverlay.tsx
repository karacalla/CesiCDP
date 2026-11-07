/**
 * Rôle : éléments posés sur la carte : marque, titre de contexte, îlot de navigation, outils.
 * Les textes posés sur la carte le sont toujours sur voile (dégradé noir de MapStage) ou sur verre.
 */
import { NavIsland } from '@/components/layout/NavIsland'
import { fr } from '@/i18n/fr'
import { useUi } from '@/store/ui'
import { MapToolbar } from './MapToolbar'

export function MapOverlay() {
  const view = useUi((s) => s.view)
  const setView = useUi((s) => s.setView)
  return (
    <>
      <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-center gap-x-6 gap-y-3 sm:inset-x-6 sm:top-6 lg:right-16">
        <p className="leading-tight text-on-dark">
          <span className="block text-2xl font-extrabold tracking-tight">{fr.app.brand}</span>
          <span className="block text-sm font-light text-muted-text-aa">{fr.app.context}</span>
        </p>
        <div className="pointer-events-auto">
          <NavIsland active={view} onChange={setView} />
        </div>
      </div>
      <MapToolbar className="absolute bottom-14 right-4 sm:right-6 lg:bottom-24 lg:right-16" />
    </>
  )
}
