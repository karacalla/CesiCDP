/**
 * Rôle : le camion du panneau (ADR-022) : il représente le camion SÉLECTIONNÉ « au dépôt ». Quand il part, sa baie
 *   montre un contour en pointillés et « Camion N · en tournée » avec l'heure de retour prévue (résultat du solveur).
 *   Cette information est toujours dans le DOM ; la couche animée (portail, `aria-hidden`, sans pointeur) ne porte
 *   aucune information.
 * Effet n° 3 du budget de CLAUDE.md §3 bis (BorderBeam, globe, camion).
 */
import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { fr } from '@/i18n/fr'
import { formatHm } from '@/lib/time'
import { TruckShowcase } from '@/features/tours/TruckShowcase'
import { useCameo } from './useCameo'

export function PanelTruck({ vehicleId, returnAt, className = '' }: { vehicleId: number; returnAt: number | null; className?: string }) {
  const bay = useRef<HTMLDivElement>(null)
  const truck = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const mover = useRef<HTMLDivElement>(null)
  const path = useRef<SVGPathElement>(null)
  const level = useMotionLevel()
  const { state, vehicleId: shown } = useCameo(vehicleId, { bay, truck, layer, mover, path })
  const id = shown ?? vehicleId
  const home = state === 'home'
  // animations complètes : le camion de la baie s'efface dès qu'il « roule » (c'est sa copie qui vole) ;
  // réduites : il s'estompe sur place (fondu), donc il reste visible pendant la transition
  const hidden = state === 'away' || (level === 'full' && !home)

  return (
    <div ref={bay} className={`relative aspect-[420/132] ${className}`}>
      <div ref={truck} className={hidden ? 'invisible' : ''}>
        <TruckShowcase vehicleId={id} />
      </div>
      {!home && (
        <div className="absolute inset-x-[4%] inset-y-[8%] flex items-start justify-center rounded-2xl border-2 border-dashed border-panel-ink-2/60 pt-[7%]">
          <p className="text-center text-sm font-semibold text-panel-ink">
            {fr.cameo.away(id)}
            {returnAt !== null && <span className="block text-xs font-normal text-panel-ink-2">{fr.cameo.back(formatHm(returnAt))}</span>}
          </p>
        </div>
      )}
      {home && <p className="sr-only">{fr.cameo.home(id)}</p>}
      {createPortal(
        <div ref={layer} hidden aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          <svg className="absolute inset-0 h-full w-full">
            <path ref={path} fill="none" stroke="rgb(244 113 181 / 0.6)" strokeWidth={2} strokeDasharray="2 9" strokeLinecap="round" opacity={0} />
          </svg>
          <div ref={mover} className="absolute left-0 top-0 origin-center">
            {/* lueur des phares (avant du camion, à droite du dessin) */}
            <span className="absolute right-[-14%] top-1/2 h-[70%] w-[30%] -translate-y-1/2 rounded-full [background:radial-gradient(closest-side,rgb(249_168_212/0.55),transparent)]" />
            <TruckShowcase vehicleId={id} decorative />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
