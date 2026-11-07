/**
 * Rôle : bord en S du panneau, qui empiète d'environ 40 px sur la carte, avec ombre et poignée verticale.
 * Choix retenu : SVG étiré (`preserveAspectRatio="none"`) rempli de la couleur du panneau : la courbe suit toute
 *   hauteur sans calcul ; la poignée est un vrai bouton (replier / déplier le panneau).
 * Alternative écartée : `clip-path: path()` (coordonnées en pixels seulement, donc non adaptatif en hauteur).
 */
import { fr } from '@/i18n/fr'

interface Props {
  collapsed: boolean
  onToggle: () => void
  controls: string
}

/** Panneau pleine largeur en haut, courbe en S au milieu, affleurant en bas. Repère 40 × 1000. */
const PATH = 'M0 0 H40 V640 C40 500 0 500 0 360 Z'

export function SEdge({ collapsed, onToggle, controls }: Props) {
  return (
    <div className="pointer-events-none absolute inset-y-0 -left-10 hidden w-10 lg:block">
      <svg
        aria-hidden
        viewBox="0 0 40 1000"
        preserveAspectRatio="none"
        className="h-full w-full fill-panel [filter:drop-shadow(-18px_0_22px_rgb(2_6_23/0.55))]"
      >
        <path d={PATH} />
      </svg>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={controls}
        aria-label={collapsed ? fr.panel.expand : fr.panel.collapse}
        title={collapsed ? fr.panel.expand : fr.panel.collapse}
        className="pointer-events-auto absolute left-0.5 top-1/2 grid h-16 w-8 -translate-y-1/2 place-items-center rounded-full"
      >
        <span aria-hidden className="h-12 w-1.5 rounded-full bg-panel-ink-2/60" />
      </button>
    </div>
  )
}
