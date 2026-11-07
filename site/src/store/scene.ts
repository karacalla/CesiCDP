/**
 * Rôle : phase de la scène carte (ADR-020) : `globe` (aucune tournée) → `flying` (vol vers les tournées) → `routes`.
 * Pourquoi un store : `globe` / `routes` se déduisent du résultat, mais le vol est un état transitoire que la carte
 *   (qui pilote la caméra) et la surcouche (bouton « Passer l'animation », annonce) doivent partager.
 */
import { create } from 'zustand'

export type ScenePhase = 'globe' | 'flying' | 'routes'

interface SceneState {
  phase: ScenePhase
  /** Rotation du globe en cours (faux après interaction, pause, 60 s, ou si les animations sont réduites). */
  spinning: boolean
  /** Incrémenté par « Passer l'animation » / Échap : la carte termine le vol immédiatement. */
  skipToken: number
  /** Message annoncé aux lecteurs d'écran (aria-live) à la fin d'un vol. */
  announce: string
  setPhase: (p: ScenePhase) => void
  setSpinning: (v: boolean) => void
  skip: () => void
  setAnnounce: (m: string) => void
}

export const useScene = create<SceneState>((set) => ({
  phase: 'globe',
  spinning: false,
  skipToken: 0,
  announce: '',
  setPhase: (phase) => set({ phase }),
  setSpinning: (spinning) => set({ spinning }),
  skip: () => set((s) => ({ skipToken: s.skipToken + 1 })),
  setAnnounce: (announce) => set({ announce }),
}))
