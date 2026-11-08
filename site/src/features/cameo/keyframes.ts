/**
 * Rôle : traduit les échantillons physiques (motion.ts) en images clés WAAPI pour chaque pièce du camion 3D
 *   (`data-part`). Toutes les pièces partagent le même temps linéaire : la physique est déjà dans les échantillons
 *   (pas de `cubic-bezier` arbitraire). Seules `transform` et `opacity` sont animées : composées hors du fil
 *   principal (essai S5).
 */
import { CAMEO } from '@/config/cameo'
import { FACES, faceShade, glareOffset, SHADOW_OFFSET, TRUCK, type Face } from '@/features/truck3d/geometry'
import { project, type Camera, type Sample } from './motion'

const DEG = 180 / Math.PI
const clamp = (v: number, m: number): number => Math.max(-m, Math.min(m, v))
const r2 = (v: number): number => Math.round(v * 100) / 100

export interface PartFrames {
  duration: number
  mover: Keyframe[]
  ground: Keyframe[]
  yaw: Keyframe[]
  shadow: Keyframe[]
  body: Keyframe[]
  rim: Keyframe[]
  steer: Keyframe[]
  glare: Keyframe[]
  headlights: Keyframe[]
  beams: Keyframe[]
  brake: Keyframe[]
  reverse: Keyframe[]
  shade: Record<Face, Keyframe[]>
}

/**
 * `dir` : +1 marche avant, −1 marche arrière. `unit` : pixels par unité camion (taille réelle de la baie).
 * Le mouvement de l'écran vient de la projection par la caméra ; le cap affiché = cap réel − azimut de la caméra.
 */
export function buildFrames(samples: Sample[], cam: Camera, dir: 1 | -1, unit: number, sus = CAMEO.suspension): PartFrames {
  const n = samples.length
  const at = (i: number): number => (n > 1 ? i / (n - 1) : 0)
  const out: PartFrames = { duration: (samples[n - 1]?.t ?? 0) * 1000, mover: [], ground: [], yaw: [], shadow: [], body: [], rim: [], steer: [], glare: [], headlights: [], beams: [], brake: [], reverse: [], shade: { top: [], south: [], north: [], front: [], back: [] } }
  samples.forEach((p, i) => {
    const offset = at(i)
    const view = project(cam, p.x, p.y)
    const psi = p.psi * DEG - view.az
    // dynamique : roulis = accélération latérale v²κ (la caisse penche vers l'extérieur), tangage = accélération
    // longitudinale dans le repère du véhicule (cabré à l'accélération, plongée au freinage)
    const lateral = p.v * p.v * p.kappa
    const longitudinal = dir * p.a
    const roll = clamp(sus.rollPerAccel * lateral, sus.maxRoll)
    const pitch = clamp(-sus.pitchPerAccel * longitudinal, sus.maxPitch)
    const steer = Math.atan(TRUCK.wheelbase * p.kappa) * DEG
    const spin = (p.s / TRUCK.wheelR) * DEG
    const braking = p.a < -40 ? 1 : 0
    out.mover.push({ offset, transform: `translate(${r2(view.sx * unit)}px, ${r2(view.sy * unit)}px) scale(${r2(view.scale * 1000) / 1000})` })
    out.ground.push({ offset, transform: `rotateX(${r2(view.tilt)}deg)` })
    out.yaw.push({ offset, transform: `rotateZ(${r2(psi)}deg)` })
    out.shadow.push({ offset, transform: `translate(${r2(SHADOW_OFFSET.x * unit)}px, ${r2(SHADOW_OFFSET.y * unit)}px) rotateZ(${r2(psi)}deg)` })
    out.body.push({ offset, transform: `rotateX(${r2(roll)}deg) rotateY(${r2(pitch)}deg)` })
    out.rim.push({ offset, transform: `rotate(${r2(spin)}deg)` })
    out.steer.push({ offset, transform: `rotateZ(${r2(steer)}deg)` })
    out.glare.push({ offset, transform: `translateX(${glareOffset(psi)}%) skewX(-18deg)` })
    out.headlights.push({ offset, opacity: dir > 0 ? 1 : 0.35 })
    out.beams.push({ offset, opacity: dir > 0 ? Math.min(1, p.v / 200) : 0 })
    out.brake.push({ offset, opacity: braking })
    out.reverse.push({ offset, opacity: dir < 0 ? 1 : 0 })
    for (const f of FACES) out.shade[f].push({ offset, opacity: faceShade(f, psi) })
  })
  return out
}
