/**
 * Rôle : réglages du camion du panneau (ADR-022). AUCUNE valeur en dur ailleurs : la machine d'états et le rendu
 *   lisent ces constantes ; les tests les remplacent par une horloge simulée.
 */
export const CAMEO = {
  /** Sortie (du panneau vers le coin supérieur puis hors écran) et retour (trajet inverse, freinage). */
  exitMs: 2_800,
  enterMs: 2_700,
  /** Fondus courts quand les animations sont réduites. */
  fadeMs: 200,
  /** T5 : passage de démonstration après 120 s sans interaction, au plus un par 10 min, absence de 20 s. */
  idleMs: 120_000,
  demoCooldownMs: 600_000,
  demoAbsentMs: 20_000,
  /** Fréquence de vérification de l'inactivité (pas de boucle d'animation continue). */
  idleCheckMs: 5_000,
  /** Réduction en fin de sortie (perspective) et tassement à l'arrivée. */
  exitScale: 0.72,
  squash: 0.04,
}
