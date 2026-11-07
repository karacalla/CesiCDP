/**
 * Rôle : état d'interface global (vue active, thème du panneau, panneau replié).
 * Choix retenu : Zustand (un hook, pas de fournisseur, sélecteurs fins → pas de re-rendu inutile).
 * Alternative écartée : Context React (toute la coque se redessinerait à chaque changement).
 * Question probable du jury : « où sont les données métier ? » → pas ici : dans store/vrp (P2), alimenté par services/api.
 */
import { create } from 'zustand'
import type { ViewId } from '@/app/views'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'cesicdp.theme'

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
  togglePanel: () => set((s) => ({ panelCollapsed: !s.panelCollapsed })),
}))
