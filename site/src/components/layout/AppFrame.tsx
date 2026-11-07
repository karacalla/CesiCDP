/**
 * Rôle : la carte occupe toute la fenêtre (ADR-018) ; le panneau est une bulle de verre posée dessus (ADR-019) :
 *   à droite, à 20 px des bords, largeur 380–560 px (≥ 1024 px) ; feuille flottante en bas, ≈ 48 % de la hauteur,
 *   en deçà. La poignée replie la bulle et rend toute la carte.
 * Choix retenu : deux couches de verre : un liseré flou (le « verre » visible, sans texte) et une surface dont
 *   l'opacité minimale est calculée pour garder 4,5:1 sur n'importe quel fond (tokens.test.ts).
 * Alternative écartée : panneau latéral opaque collé au bord (la carte redevient une moitié d'écran).
 * Question probable du jury : « le texte reste-t-il lisible sur une carte claire ? » → oui : contraste vérifié
 *   en composant le verre sur blanc pur et sur noir pur ; repli opaque si la transparence est réduite.
 */
import type { ReactNode } from 'react'
import { fr } from '@/i18n/fr'

interface Props {
  map: ReactNode
  panel: ReactNode
  collapsed: boolean
  onTogglePanel: () => void
}

const PANEL_ID = 'panneau'
export const BUBBLE_ID = 'panneau-bulle'

export function AppFrame({ map, panel, collapsed, onTogglePanel }: Props) {
  return (
    <div className="fixed inset-0 h-dvh overflow-hidden bg-bg-darker">
      <a href={`#${PANEL_ID}`} className="sr-only z-50 rounded-full bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Aller au panneau de travail
      </a>
      <div className="absolute inset-0">{map}</div>

      <div
        id={BUBBLE_ID}
        hidden={collapsed}
        className="glass-bubble absolute inset-x-3 bottom-3 z-20 h-[var(--sheet-h)] rounded-[28px] p-1.5 lg:inset-x-auto lg:bottom-[var(--panel-gap)] lg:right-[var(--panel-gap)] lg:top-[var(--panel-gap)] lg:h-auto lg:w-[var(--panel-w)] lg:rounded-bubble"
      >
        <main
          id={PANEL_ID}
          aria-label={fr.panel.label}
          tabIndex={-1}
          className="flex h-full flex-col gap-4 overflow-y-auto overscroll-contain rounded-[22px] bg-[var(--glass-bg)] px-5 py-4 text-panel-ink sm:px-6 lg:gap-6 lg:rounded-[30px] lg:py-6 [&>*]:shrink-0"
        >
          {panel}
        </main>
      </div>

      <button
        type="button"
        onClick={onTogglePanel}
        aria-expanded={!collapsed}
        aria-controls={BUBBLE_ID}
        aria-label={collapsed ? fr.panel.expand : fr.panel.collapse}
        title={collapsed ? fr.panel.expand : fr.panel.collapse}
        className={`glass absolute z-30 grid place-items-center rounded-full text-on-dark transition-colors hover:bg-black/60 ${
          collapsed
            ? 'bottom-3 left-1/2 h-8 w-16 -translate-x-1/2 lg:bottom-auto lg:left-auto lg:right-[var(--panel-gap)] lg:top-1/2 lg:h-16 lg:w-8 lg:-translate-y-1/2 lg:translate-x-0'
            : 'bottom-[calc(var(--sheet-h)_-_4px)] left-1/2 h-8 w-16 -translate-x-1/2 lg:bottom-auto lg:left-auto lg:right-[calc(var(--panel-w)_+_var(--panel-gap)_-_14px)] lg:top-1/2 lg:h-16 lg:w-8 lg:-translate-y-1/2 lg:translate-x-0'
        }`}
      >
        <span aria-hidden className="h-1.5 w-8 rounded-full bg-white/70 lg:h-8 lg:w-1.5" />
      </button>
    </div>
  )
}
