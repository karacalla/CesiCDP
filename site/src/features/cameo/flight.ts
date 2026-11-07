/**
 * Rôle : trajet du camion du panneau et images clés de l'animation (résultat S5 : `transform` + `opacity` joués par
 *   WAAPI, composés hors du fil principal ; précalcul ≈ 4 ms).
 *   Trajet : de la baie du camion, virage vers le coin supérieur droit du panneau, puis hors de l'écran.
 */
export interface Pt {
  x: number
  y: number
}

/** Courbe : départ vers la droite (le camion est garé cabine à droite), virage, sortie en haut à droite. */
export function flightPath(start: Pt, corner: Pt, viewportW: number): string {
  const out: Pt = { x: viewportW + 220, y: -180 }
  return [
    `M${start.x} ${start.y}`,
    `C${start.x + 140} ${start.y + 10}, ${corner.x - 40} ${corner.y + 110}, ${corner.x} ${corner.y}`,
    `S${out.x - 60} ${out.y + 30}, ${out.x} ${out.y}`,
  ].join(' ')
}

/**
 * Images clés de SORTIE échantillonnées le long du trajet : translation au centre, rotation selon la tangente,
 * réduction progressive (perspective), disparition en fin de course. L'entrée = mêmes images en sens inverse
 * (le camion recule dans sa baie, cabine vers l'extérieur, comme à quai).
 */
export function flightKeyframes(path: SVGPathElement, w: number, h: number, endScale: number, samples = 48): Keyframe[] {
  const len = path.getTotalLength()
  const frames: Keyframe[] = []
  for (let i = 0; i <= samples; i++) {
    const f = i / samples
    const p = path.getPointAtLength(f * len)
    const q = path.getPointAtLength(Math.min(len, f * len + 2))
    const back = f === 1 ? path.getPointAtLength(len - 2) : null
    const angle = back ? Math.atan2(p.y - back.y, p.x - back.x) : Math.atan2(q.y - p.y, q.x - p.x)
    const s = 1 - (1 - endScale) * f
    frames.push({
      offset: f,
      transform: `translate(${(p.x - w / 2).toFixed(1)}px, ${(p.y - h / 2).toFixed(1)}px) rotate(${((angle * 180) / Math.PI).toFixed(1)}deg) scale(${s.toFixed(3)})`,
      opacity: f < 0.82 ? 1 : Math.max(0, (1 - f) / 0.18),
    })
  }
  return frames
}

export function reverseKeyframes(frames: Keyframe[]): Keyframe[] {
  return [...frames].reverse().map((k) => ({ ...k, offset: 1 - Number(k.offset ?? 0) }))
}
