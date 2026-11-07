/**
 * Rôle : toute animation de caméra (flyTo, fitBounds, easeTo) passe par ici, pour que le sujet soit centré dans
 *   la zone de carte VISIBLE, à côté de la bulle du panneau (≥ 1024 px) ou au-dessus de la feuille (< 1024 px).
 * Choix retenu : marge de caméra MapLibre (`padding`) augmentée de l'emprise réelle de la bulle, lue dans le DOM
 *   au moment du mouvement (elle dépend de la largeur de la fenêtre et du repli du panneau).
 * Alternative écartée : décaler le centre « à la main » (faux dès que la carte est inclinée ou tournée).
 */
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/**
 * Ajoute à `base` la place occupée par la bulle. Bulle latérale (plus haute que large, collée à droite) → marge
 * droite ; feuille du bas → marge basse. Bulle absente ou repliée (`null`, taille nulle) → `base` inchangé.
 */
export function cameraPadding(base: Insets, viewport: { width: number; height: number }, bubble: Rect | null): Insets {
  if (!bubble || bubble.width <= 0 || bubble.height <= 0) return base
  const side = bubble.left > viewport.width / 3 && bubble.height > viewport.height / 2
  if (side) return { ...base, right: base.right + Math.max(0, viewport.width - bubble.left) }
  return { ...base, bottom: base.bottom + Math.max(0, viewport.height - bubble.top) }
}

/** Emprise de la bulle dans le conteneur de la carte (null si repliée ou absente). */
export function bubbleRect(container: HTMLElement, bubbleId = 'panneau-bulle'): Rect | null {
  const el = document.getElementById(bubbleId)
  if (!el || el.hidden) return null
  const b = el.getBoundingClientRect()
  const c = container.getBoundingClientRect()
  return { left: b.left - c.left, top: b.top - c.top, width: b.width, height: b.height }
}

/** Marge de caméra à passer à `flyTo` / `fitBounds` / `easeTo` pour la carte donnée. */
export function visiblePadding(container: HTMLElement, base: Insets = NO_INSETS): Insets {
  return cameraPadding(base, { width: container.clientWidth, height: container.clientHeight }, bubbleRect(container))
}
