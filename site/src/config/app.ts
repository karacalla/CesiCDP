/**
 * Rôle : réglages d'affichage de la carte (vue initiale, inclinaisons).
 * Choix retenu : vue « drone » inclinée de 0 à 30° par défaut ; 60–70° réservés à la sélection d'un camion (P5).
 */

export interface CameraView {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
}

/** Cadre Nancy → vallées vosgiennes (zone de l'instance de démonstration NANCY-60). */
export const INITIAL_VIEW: CameraView = { longitude: 6.42, latitude: 48.42, zoom: 8.4, pitch: 20, bearing: -12 }

/** Centre-ville de Nancy (dépôt fictif de la démonstration, précisé en P2). */
export const DEPOT_FOCUS: CameraView = { longitude: 6.1844, latitude: 48.6921, zoom: 12.5, pitch: 20, bearing: 0 }

/** Vue d'ouverture (globe, ADR-020) ; recalée par GlobeDirector selon la place visible. */
export const GLOBE_VIEW: CameraView = { longitude: 9, latitude: 44, zoom: 1.6, pitch: 0, bearing: 0 }

export const MAX_PITCH = 70

/** Durée des mouvements de caméra (ms) ; 0 si l'utilisateur demande moins d'animations. */
export const CAMERA_MS = 1200

/** Inclinaison « vue de drone » (maquette : 0–25°) ; la vue 60–70° est réservée à la simulation (P5). */
export const DRONE_PITCH = 20

/** Heure affichée par défaut sur les tournées calculées (tronçon parcouru / à venir), modifiable par le curseur. */
export const DEMO_CLOCK = 11 * 60

/** Facteur d'émission (kg CO₂ par km). Valeur reprise du prototype : SOURCE À FOURNIR PAR L'ÉQUIPE (SUIVI). */
export const CO2_KG_PER_KM = 0.29
