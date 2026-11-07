/**
 * Rôle : FAÇADE UNIQUE vers le solveur. Toute l'interface passe par `api` ; le mode se choisit par
 *   `VITE_API_MODE=mock|http` (mock par défaut : données simulées déterministes).
 * Choix retenu : une interface `ApiClient`, deux implémentations (mockApi, httpApi) interchangeables.
 * Alternative écartée : appels `fetch` répartis dans les composants (impossible à simuler et à tester).
 * Question probable du jury : « que faut-il pour brancher le vrai solveur ? » → exposer les routes HTTP décrites
 *   dans httpApi.ts et renvoyer le format de `adapters.ts` ; aucun composant à modifier.
 */
import { httpApi } from './httpApi'
import { mockApi } from './mockApi'
import type { ApiClient } from './types'

export type { ApiClient, InstanceSummary } from './types'

export const api: ApiClient = import.meta.env.VITE_API_MODE === 'http' ? httpApi : mockApi
