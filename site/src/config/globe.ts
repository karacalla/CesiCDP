/**
 * Rôle : réglages de la scène d'ouverture (globe) et du vol vers les tournées (ADR-020). Aucune valeur en dur ailleurs.
 * Les dépôts sont FICTIFS (démonstration) : positions de grandes villes, aucun site réel d'entreprise.
 */
export const GLOBE = {
  /** Vitesse de rotation (degrés de longitude par seconde). */
  degPerSecond: 3.5,
  /** Plafond de rendu pendant la rotation (images par seconde). */
  maxFps: 30,
  /** Arrêt automatique de toute animation du globe (ms). */
  autoStopMs: 60_000,
  /** Vol du globe vers les tournées (ms) et retour au globe (ms). */
  flyMs: 4_500,
  returnMs: 3_000,
  /** Fondu de remplacement quand les animations sont réduites (ms, ≤ 150). */
  fadeMs: 150,
  /** Centre de la vue globe (Europe de l'Ouest) et rayon visé du globe, en part de la plus petite dimension visible. */
  center: [9, 44] as [number, number],
  radiusShare: 0.42,
  /** Pulsation des anneaux (période en ms, rayons en px). */
  pulseMs: 2_400,
  ringFrom: 6,
  ringTo: 22,
}

/** Réseau de dépôts simulé (démonstration). `hub` = dépôt de l'instance de démonstration NANCY-60. */
export const DEMO_DEPOTS: ReadonlyArray<{ id: string; lng: number; lat: number; hub?: boolean }> = [
  { id: 'nancy', lng: 6.1844, lat: 48.6921, hub: true },
  { id: 'paris', lng: 2.35, lat: 48.86 },
  { id: 'lille', lng: 3.06, lat: 50.63 },
  { id: 'lyon', lng: 4.84, lat: 45.76 },
  { id: 'bordeaux', lng: -0.58, lat: 44.84 },
  { id: 'toulouse', lng: 1.44, lat: 43.6 },
  { id: 'bruxelles', lng: 4.35, lat: 50.85 },
  { id: 'francfort', lng: 8.68, lat: 50.11 },
  { id: 'munich', lng: 11.58, lat: 48.14 },
  { id: 'milan', lng: 9.19, lat: 45.46 },
  { id: 'barcelone', lng: 2.17, lat: 41.39 },
  { id: 'madrid', lng: -3.7, lat: 40.42 },
  { id: 'amsterdam', lng: 4.9, lat: 52.37 },
]
