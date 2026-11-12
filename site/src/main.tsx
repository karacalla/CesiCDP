/**
 * Rôle : point d'entrée de la SPA (chargé par index.html via Vite) : monte <App /> dans #root.
 * Choix retenu : `createRoot` (rendu concurrent de React 18+/19) ; `StrictMode` en développement double les
 *   effets pour révéler ceux qui ne se nettoient pas (rAF, écouteurs de carte) — sans effet en production.
 * Question probable du jury : « pourquoi une SPA sans serveur ? » → outil métier local : pas de SEO, pas de SSR
 *   utile, démonstration hors-ligne (hors tuiles de carte) ; Vite sert en dev et produit des fichiers statiques.
 */
import { StrictMode } from 'react'
import { MotionConfig } from 'motion/react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { App } from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Élément #root introuvable dans index.html')

createRoot(root).render(
  <StrictMode>
    {/* « user » : les animations motion respectent prefers-reduced-motion (CLAUDE.md §3 bis) */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
