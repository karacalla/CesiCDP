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
export const INITIAL_VIEW: CameraView = { longitude: 6.42, latitude: 48.42, zoom: 8.4, pitch: 28, bearing: -12 }

/** Centre-ville de Nancy (dépôt fictif de la démonstration, précisé en P2). */
export const DEPOT_FOCUS: CameraView = { longitude: 6.1844, latitude: 48.6921, zoom: 12.5, pitch: 30, bearing: 0 }

export const MAX_PITCH = 70

/** Durée des mouvements de caméra (ms) ; 0 si l'utilisateur demande moins d'animations. */
export const CAMERA_MS = 1200
