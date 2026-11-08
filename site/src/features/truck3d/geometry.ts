/**
 * Rôle : géométrie et éclairage du camion 3D (ADR-025), partagés par le rendu statique et l'animation.
 *   Repère : x vers l'avant (cabine), y vers le flanc visible au repos (« sud »), z vers le haut ; unités camion
 *   (longueur 420). Lumière : soleil en haut à gauche de l'écran (même côté que le halo du globe), assez haut.
 */
export const TRUCK = {
  /** Largeur du cadre de dessin (unités) : le camion (420) et une marge pour le cap de 16° au repos. */
  frame: 460,
  frameH: 210,
  inset: 20,
  /** Plan du sol dessiné (unités) et essieu arrière (pivot des rotations, point suivi par la trajectoire). */
  plane: { w: 420, d: 132 },
  rearAxle: { x: 81, y: 66 },
  wheelR: 16,
  wheelbase: 273,
  /** Pose au repos dans la baie : inclinaison de la caméra et cap (légèrement vers le spectateur). */
  rest: { tilt: 54, psi: 16 },
  /** Marge de sortie d'écran mesurée depuis l'essieu arrière : porte-à-faux arrière (≈ 80) + demi-largeur (≈ 50). */
  offscreenMargin: 130,
  /** Hauteur moyenne de la caisse, pour la longueur de l'ombre portée. */
  shadowHeight: 46,
}

/** Lumière (vecteur vers le soleil), normalisée. */
const Lraw = [-0.45, -0.55, 0.7] as const
const Ln = Math.hypot(...Lraw)
export const LIGHT = [Lraw[0] / Ln, Lraw[1] / Ln, Lraw[2] / Ln] as const

export type Face = 'top' | 'south' | 'north' | 'front' | 'back'
const NORMALS: Record<Face, readonly [number, number, number]> = {
  top: [0, 0, 1],
  south: [0, 1, 0],
  north: [0, -1, 0],
  front: [1, 0, 0],
  back: [-1, 0, 0],
}

/**
 * Opacité du voile sombre d'une face (0 = pleine lumière) pour un cap apparent `psiDeg` : modèle de Lambert,
 * ambiance 0,38, plus une occlusion légère. Une face qui se tourne vers le soleil s'éclaircit pendant le virage.
 */
export function faceShade(face: Face, psiDeg: number): number {
  const [nx, ny, nz] = NORMALS[face]
  const p = (psiDeg * Math.PI) / 180
  const wx = nx * Math.cos(p) - ny * Math.sin(p)
  const wy = nx * Math.sin(p) + ny * Math.cos(p)
  const lambert = Math.max(0, wx * LIGHT[0] + wy * LIGHT[1] + nz * LIGHT[2])
  return Math.round(0.62 * (1 - (0.38 + 0.62 * lambert)) * 1000) / 1000
}

/** Décalage de l'ombre portée au sol (unités) : projection de la caisse selon la direction de la lumière. */
export const SHADOW_OFFSET = { x: (-LIGHT[0] / LIGHT[2]) * TRUCK.shadowHeight, y: (-LIGHT[1] / LIGHT[2]) * TRUCK.shadowHeight }

/** Reflet du pare-brise : position du reflet (en %) selon le cap apparent ; il glisse quand le camion tourne. */
export function glareOffset(psiDeg: number): number {
  return Math.round(Math.sin(((psiDeg + 20) * Math.PI) / 180) * 120)
}

/** Longueur CSS de n unités camion (`--u` = largeur du conteneur / TRUCK.frame). */
export const u = (n: number): string => `calc(${n} * var(--u))`

export const FACES: Face[] = ['top', 'south', 'north', 'front', 'back']
