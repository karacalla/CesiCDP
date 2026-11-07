/**
 * Rôle : commandes de la scène d'ouverture, posées sur la carte : légende « Réseau de dépôts simulé
 *   (démonstration) », pause / lecture de la rotation (WCAG 2.2.2 : tout mouvement automatique > 5 s), bouton
 *   « Passer l'animation » pendant le vol (ou Échap), annonce de l'arrivée aux lecteurs d'écran.
 */
import { FastForward, Pause, Play } from 'lucide-react'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { fr } from '@/i18n/fr'
import { useScene } from '@/store/scene'

export function GlobeControls() {
  const phase = useScene((s) => s.phase)
  const spinning = useScene((s) => s.spinning)
  const announce = useScene((s) => s.announce)
  const setSpinning = useScene((s) => s.setSpinning)
  const skip = useScene((s) => s.skip)
  const level = useMotionLevel()

  return (
    <>
      <p aria-live="polite" className="sr-only">{announce}</p>
      {phase === 'globe' && (
        <div className="pointer-events-auto absolute bottom-[calc(var(--sheet-h)_+_24px)] left-5 flex items-center gap-2 lg:bottom-6 lg:left-6 panel-collapsed:bottom-6">
          {level === 'full' && (
            <button
              type="button"
              onClick={() => setSpinning(!spinning)}
              aria-label={spinning ? fr.globe.pause : fr.globe.play}
              title={spinning ? fr.globe.pause : fr.globe.play}
              className="glass grid size-9 place-items-center rounded-full text-on-dark hover:bg-black/60"
            >
              {spinning ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
            </button>
          )}
          <p className="glass inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm text-on-dark">
            <span aria-hidden className="size-2 rounded-full bg-accent shadow-[0_0_0_3px_rgb(245_158_11/0.25)]" />
            {fr.globe.legend}
          </p>
        </div>
      )}
      {phase === 'flying' && (
        <button
          type="button"
          onClick={skip}
          className="glass pointer-events-auto absolute bottom-[calc(var(--sheet-h)_+_24px)] left-1/2 inline-flex h-10 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-sm font-semibold text-on-dark hover:bg-black/60 lg:bottom-8 lg:left-[calc((100%_-_var(--panel-w)_-_var(--panel-gap))/2)]"
        >
          <FastForward size={16} aria-hidden /> {fr.globe.skip}
        </button>
      )}
    </>
  )
}
