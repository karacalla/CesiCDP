/**
 * Rôle : contenu du panneau : en-tête (recherche, équipe), titre de la vue active, corps de la vue, mention RGPD.
 * En phase 1 le corps des vues est un état vide explicite ; chaque phase suivante remplit une vue.
 */
import { Inbox } from 'lucide-react'
import { ConstraintsView } from '@/features/constraints/ConstraintsView'
import { DataView } from '@/features/data/DataView'
import { RunView } from '@/features/run/RunView'
import { ToursView } from '@/features/tours/ToursView'
import { PanelHeader } from '@/components/layout/PanelHeader'
import { PrivacyNotice } from '@/components/layout/PrivacyNotice'
import { fr } from '@/i18n/fr'
import { useUi } from '@/store/ui'

export function PanelContent() {
  const view = useUi((s) => s.view)
  return (
    <>
      <PanelHeader />
      <div>
        <p className="hidden text-sm font-light text-panel-ink-2 lg:block">{fr.viewIntro[view]}</p>
        <h1 className="text-2xl lg:mt-1 lg:text-3xl font-semibold tracking-tight text-panel-ink">{fr.views[view]}</h1>
      </div>
      {view === 'tours' ? (
        <ToursView />
      ) : view === 'data' ? (
        <DataView />
      ) : view === 'constraints' ? (
        <ConstraintsView />
      ) : view === 'run' ? (
        <RunView />
      ) : (
        <div className="grid flex-1 place-items-center rounded-card border border-dashed border-panel-line p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Inbox size={28} aria-hidden className="text-panel-ink-2" />
            <p className="text-sm text-panel-ink-2">{fr.empty}</p>
          </div>
        </div>
      )}
      <PrivacyNotice />
    </>
  )
}
