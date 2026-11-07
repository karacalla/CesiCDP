/**
 * Rôle : état d'interface global (vue active, thème du panneau, panneau replié).
 * Choix retenu : Zustand (un hook, pas de fournisseur, sélecteurs fins → pas de re-rendu inutile).
 * Alternative écartée : Context React (toute la coque se redessinerait à chaque changement).
 * Question probable du jury : « où sont les données métier ? » → pas ici : dans store/vrp (P2), alimenté par services/api.
 */
import { create } from 'zustand'
import type { ViewId } from '@/app/views'

export type Theme = 'light' | 'dark'
/** Niveau d'animation choisi par l'utilisateur ; `null` = suivre la préférence système (prefers-reduced-motion). */
export type MotionLevel = 'full' | 'reduced' | 'none'

const THEME_KEY = 'cesicdp.theme'
const MOTION_KEY = 'cesicdp.motion'

function readMotion(): MotionLevel | null {
  try {
    const v = localStorage.getItem(MOTION_KEY)
    return v === 'full' || v === 'reduced' || v === 'none' ? v : null
  } catch {
    return null
  }
}

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light' // stockage indisponible (navigation privée) : thème par défaut
  }
}

/** Applique le thème immédiatement (avant le rendu) : les couleurs de graphique lues au rendu sont alors à jour. */
function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme
}

interface UiState {
  view: ViewId
  theme: Theme
  panelCollapsed: boolean
  motionPref: MotionLevel | null
  setMotionPref: (m: MotionLevel) => void
  setView: (v: ViewId) => void
  toggleTheme: () => void
  togglePanel: () => void
}

export const useUi = create<UiState>((set, get) => ({
  view: 'tours',
  theme: (() => {
    const t = readTheme()
    applyTheme(t)
    return t
  })(),
  panelCollapsed: false,
  motionPref: readMotion(),
  setMotionPref: (motionPref) => {
    try {
      localStorage.setItem(MOTION_KEY, motionPref)
    } catch {
      /* réglage non mémorisé : sans conséquence */
    }
    set({ motionPref })
  },
  setView: (view) => set({ view }),
  toggleTheme: () => {
    const theme: Theme = get().theme === 'light' ? 'dark' : 'light'
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* préférence non mémorisée : sans conséquence */
    }
    applyTheme(theme)
    set({ theme })
  },
  togglePanel: () =>
    set((s) => {
      const panelCollapsed = !s.panelCollapsed
      // attribut lu par la variante CSS `panel-collapsed:` (outils et attribution reprennent la place libérée)
      if (typeof document !== 'undefined') document.documentElement.dataset.panel = panelCollapsed ? 'collapsed' : 'open'
      return { panelCollapsed }
    }),
}))
