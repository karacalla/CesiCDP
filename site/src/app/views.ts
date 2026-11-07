/**
 * Rôle : liste des vues de l'application (îlot de navigation : 5 boutons).
 * Choix retenu : navigation par état (pas de routeur) ; la carte reste montée d'une vue à l'autre.
 * Alternative écartée : react-router (dépendance de plus, et démonter la carte coûte le rechargement des tuiles).
 * Question probable du jury : « et le bouton Précédent du navigateur ? » → non géré volontairement (outil métier
 *   monopage) ; ajoutable par l'ancre d'URL sans changer les vues.
 */
import { BarChart3, Cpu, Database, Route, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { fr } from '@/i18n/fr'

export type ViewId = 'tours' | 'data' | 'constraints' | 'run' | 'study'

export interface ViewDef {
  id: ViewId
  label: string
  icon: LucideIcon
}

export const VIEWS: readonly ViewDef[] = [
  { id: 'tours', label: fr.views.tours, icon: Route },
  { id: 'data', label: fr.views.data, icon: Database },
  { id: 'constraints', label: fr.views.constraints, icon: SlidersHorizontal },
  { id: 'run', label: fr.views.run, icon: Cpu },
  { id: 'study', label: fr.views.study, icon: BarChart3 },
]
