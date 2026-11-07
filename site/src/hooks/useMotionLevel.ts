/**
 * Rôle : niveau d'animation effectif : réglage « Animations » s'il a été choisi, sinon préférence système
 *   (`prefers-reduced-motion` → « réduites »). `full` = tout ; `reduced` = pas d'animation automatique, fondus
 *   courts ; `none` = états sans mouvement.
 */
import { useUi, type MotionLevel } from '@/store/ui'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export function useMotionLevel(): MotionLevel {
  const pref = useUi((s) => s.motionPref)
  const reduced = usePrefersReducedMotion()
  return pref ?? (reduced ? 'reduced' : 'full')
}
