/**
 * Profil d'altitude d'un tracé ([lng, lat, alt][]) mis à l'échelle d'une boîte w × h.
 * Renvoie le chemin SVG (`d`) et les points calculés (`pts`).
 */
export const elevationProfile = (coords, w = 96, h = 28) => {
  const alts = coords.map((c) => c[2])
  const min = Math.min(...alts)
  const max = Math.max(...alts)
  const pts = coords.map((c, i) => [
    (i / (coords.length - 1)) * w,
    h - 3 - ((c[2] - min) / (max - min || 1)) * (h - 6),
  ])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  return { d, pts }
}

/** Point interpolé à la position t (0 → 1) le long de `pts`. */
export const pointAt = (pts, t) => {
  const f = t * (pts.length - 1)
  const i = Math.min(Math.floor(f), pts.length - 2)
  const k = f - i
  return [
    pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k,
    pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k,
  ]
}
