/**
 * Rôle : physique du camion du panneau (ADR-025), en fonctions pures et testées :
 *   1. trajectoire de l'ESSIEU ARRIÈRE : ligne droite, clothoïde (courbure qui varie progressivement, comme un volant
 *      qu'on tourne), arc de rayon ≥ la longueur du camion, clothoïde, ligne droite ;
 *   2. vitesse planifiée : accélération et freinage bornés, vitesse bornée dans le virage par l'accélération
 *      latérale (v² / R), à-coups lissés ; marche arrière plus lente pour revenir à quai ;
 *   3. caméra fixe (élévation 36°) qui suit le camion du regard : projection perspective, inclinaison et azimut
 *      apparents, échelle due à l'éloignement (aucun facteur arbitraire).
 * Alternative écartée : courbe de Bézier + `cubic-bezier` (courbure et vitesse arbitraires, rotation de l'image).
 */
import { CAMEO } from '@/config/cameo'

const RAD = Math.PI / 180

export interface PathPoint {
  s: number
  x: number
  y: number
  /** Cap (radians, 0 = vers la droite de l'écran, positif = vers le bas). */
  psi: number
  kappa: number
}

const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

/** Trajectoire de sortie depuis l'essieu arrière au repos (0, 0), cap initial `psi0`, sur `length` unités. */
export function exitPath(psi0: number, length: number, p = CAMEO.path): PathPoint[] {
  const dPsi = p.headingOut * RAD - psi0
  const kMax = Math.sign(dPsi) / p.radius
  const hold = Math.max(0, Math.abs(dPsi) * p.radius - p.clothoid)
  const s1 = p.straightIn
  const s2 = s1 + p.clothoid
  const s3 = s2 + hold
  const s4 = s3 + p.clothoid
  const kappaAt = (s: number): number => kMax * (s < s2 ? smooth((s - s1) / p.clothoid) : s < s3 ? 1 : 1 - smooth((s - s3) / p.clothoid))
  const out: PathPoint[] = [{ s: 0, x: 0, y: 0, psi: psi0, kappa: 0 }]
  let x = 0
  let y = 0
  let psi = psi0
  for (let s = p.step; s <= length; s += p.step) {
    const k = kappaAt(s - p.step / 2)
    const mid = psi + (k * p.step) / 2
    x += Math.cos(mid) * p.step
    y += Math.sin(mid) * p.step
    psi += k * p.step
    out.push({ s, x, y, psi, kappa: s > s4 ? 0 : kappaAt(s) })
  }
  return out
}

export interface SpeedPlan {
  /** Vitesse (unités / s) en chaque point de la trajectoire. */
  v: number[]
}

/** Vitesse admissible : passe avant (accélération), passe arrière (freinage vers `vEnd`), plafond latéral. */
export function planSpeed(path: PathPoint[], o: { v0: number; vEnd: number | null; vMax: number; aMax: number; brake: number; aLat: number }): SpeedPlan {
  const n = path.length
  const cap = path.map((p) => Math.min(o.vMax, Math.abs(p.kappa) > 1e-9 ? Math.sqrt(o.aLat / Math.abs(p.kappa)) : Infinity))
  const v = new Array<number>(n).fill(0)
  v[0] = Math.min(o.v0, cap[0] ?? o.v0)
  for (let i = 1; i < n; i++) {
    const ds = (path[i]?.s ?? 0) - (path[i - 1]?.s ?? 0)
    v[i] = Math.min(cap[i] ?? 0, Math.sqrt((v[i - 1] ?? 0) ** 2 + 2 * o.aMax * ds))
  }
  if (o.vEnd !== null) {
    v[n - 1] = Math.min(v[n - 1] ?? 0, o.vEnd)
    for (let i = n - 2; i >= 0; i--) {
      const ds = (path[i + 1]?.s ?? 0) - (path[i]?.s ?? 0)
      v[i] = Math.min(v[i] ?? 0, Math.sqrt((v[i + 1] ?? 0) ** 2 + 2 * o.brake * ds))
    }
  }
  return { v }
}

export interface Sample {
  t: number
  /** Abscisse curviligne sur la trajectoire de sortie (unités). */
  s: number
  x: number
  y: number
  psi: number
  kappa: number
  /** Vitesse (≥ 0) et sa dérivée (unités / s, unités / s²). */
  v: number
  a: number
}

function interp(path: PathPoint[], s: number): PathPoint {
  const step = (path[1]?.s ?? 1) - (path[0]?.s ?? 0)
  const i = Math.max(0, Math.min(path.length - 2, Math.floor(s / step)))
  const p = path[i] as PathPoint
  const q = path[i + 1] ?? p
  const f = Math.max(0, Math.min(1, (s - p.s) / (step || 1)))
  return { s, x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, psi: p.psi + (q.psi - p.psi) * f, kappa: p.kappa + (q.kappa - p.kappa) * f }
}

/**
 * Échantillons à pas de temps constant. `forward` : de s = 0 à la fin ; sinon de la fin à s = 0 (marche arrière).
 * Les à-coups sont limités en lissant la vitesse sur `jerkS` secondes (deux moyennes glissantes), puis la distance
 * parcourue est recalée sur la longueur exacte de la trajectoire.
 */
export function sampleMotion(path: PathPoint[], plan: SpeedPlan, forward: boolean, fps = CAMEO.keyframeFps, jerkS = CAMEO.dyn.jerkS): Sample[] {
  const n = path.length
  const L = path[n - 1]?.s ?? 0
  // temps de passage en chaque point (sens du parcours)
  const order = forward ? path.map((_, i) => i) : path.map((_, i) => n - 1 - i)
  const vs = order.map((i) => plan.v[i] ?? 0)
  const ts = [0]
  for (let k = 1; k < n; k++) ts.push((ts[k - 1] ?? 0) + Math.abs((path[order[k] ?? 0]?.s ?? 0) - (path[order[k - 1] ?? 0]?.s ?? 0)) / Math.max(1e-3, ((vs[k] ?? 0) + (vs[k - 1] ?? 0)) / 2))
  const T = ts[n - 1] ?? 0
  const dt = 1 / fps
  const m = Math.max(2, Math.ceil(T / dt) + 1)
  let k = 0
  const vt: number[] = []
  for (let j = 0; j < m; j++) {
    const t = Math.min(T, j * dt)
    while (k < n - 2 && (ts[k + 1] ?? 0) < t) k++
    const f = ((t - (ts[k] ?? 0)) / Math.max(1e-6, (ts[k + 1] ?? 0) - (ts[k] ?? 0)))
    vt.push((vs[k] ?? 0) + ((vs[k + 1] ?? 0) - (vs[k] ?? 0)) * Math.max(0, Math.min(1, f)))
  }
  const w = Math.max(1, Math.round((jerkS * fps) / 2))
  const blur = (arr: number[]): number[] => arr.map((_, i) => {
    let sum = 0
    let c = 0
    for (let d = -w; d <= w; d++) {
      const val = arr[Math.max(0, Math.min(arr.length - 1, i + d))] ?? 0
      sum += val
      c++
    }
    return sum / c
  })
  // arrêt de quelques images avant le départ (desserrage du frein) ou après l'arrivée : la vitesse lissée part de 0
  // et y revient sans saut, l'accélération monte et descend progressivement (à-coup limité)
  const rest = new Array<number>(2 * w).fill(0)
  const vSmooth = blur(blur(forward ? [...rest, ...vt] : [...vt, ...rest]))
  vSmooth[forward ? 0 : vSmooth.length - 1] = 0
  // distance parcourue, recalée sur L
  const total = vSmooth.length
  const dist = [0]
  for (let j = 1; j < total; j++) dist.push((dist[j - 1] ?? 0) + (((vSmooth[j] ?? 0) + (vSmooth[j - 1] ?? 0)) / 2) * dt)
  const scale = L / Math.max(1e-6, dist[total - 1] ?? 1)
  return dist.map((d, j) => {
    const travelled = d * scale
    const s = forward ? travelled : L - travelled
    const p = interp(path, s)
    const v = (vSmooth[j] ?? 0) * scale
    const vPrev = (vSmooth[Math.max(0, j - 1)] ?? 0) * scale
    const vNext = (vSmooth[Math.min(total - 1, j + 1)] ?? 0) * scale
    return { t: j * dt, s, x: p.x, y: p.y, psi: p.psi, kappa: p.kappa, v, a: (vNext - vPrev) / (2 * dt) || (v - vPrev) / dt }
  })
}

export interface Camera {
  /** Distance au point de repos (= perspective CSS), éloignement horizontal et hauteur (unités). */
  r0: number
  d0: number
  h: number
  cosE: number
  sinE: number
}

export function makeCamera(c = CAMEO.camera): Camera {
  const e = c.elevationDeg * RAD
  return { r0: c.distance, d0: c.distance * Math.cos(e), h: c.distance * Math.sin(e), cosE: Math.cos(e), sinE: Math.sin(e) }
}

export interface View {
  /** Déplacement à l'écran du point de repos (unités, échelle 1 au repos). */
  sx: number
  sy: number
  /** Facteur d'échelle dû à la distance, inclinaison apparente (90° − élévation) et azimut (degrés). */
  scale: number
  tilt: number
  az: number
}

/** Projection perspective d'un point du sol par la caméra fixe placée au sud, en hauteur, visant le point de repos. */
export function project(cam: Camera, x: number, y: number): View {
  const depth = cam.cosE * (cam.d0 - y) + cam.sinE * cam.h
  const horiz = Math.hypot(x, cam.d0 - y)
  return {
    sx: (cam.r0 * x) / depth,
    sy: (cam.r0 * (cam.sinE * (y - cam.d0) + cam.cosE * cam.h)) / depth,
    scale: cam.r0 / depth,
    tilt: 90 - Math.atan2(cam.h, horiz) / RAD,
    az: Math.atan2(x, cam.d0 - y) / RAD,
  }
}
