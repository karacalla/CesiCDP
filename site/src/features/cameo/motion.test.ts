import { describe, expect, it } from 'vitest'
import { CAMEO } from '@/config/cameo'
import { buildFrames } from './keyframes'
import { exitPath, makeCamera, planSpeed, project, sampleMotion } from './motion'

const RAD = Math.PI / 180
const d = CAMEO.dyn
const path = exitPath(16 * RAD, 1400)

describe('camion du panneau : trajectoire', () => {
  it('rayon jamais inférieur au rayon de braquage, courbure continue (clothoïde, pas de coup de volant)', () => {
    for (const p of path) expect(Math.abs(p.kappa)).toBeLessThanOrEqual(1 / CAMEO.path.radius + 1e-9)
    for (let i = 1; i < path.length; i++) expect(Math.abs((path[i]?.kappa ?? 0) - (path[i - 1]?.kappa ?? 0))).toBeLessThan(2e-4)
  })
  it('vire à gauche vers le haut de l’écran et finit au cap prévu', () => {
    const last = path[path.length - 1]
    expect(last?.psi).toBeCloseTo(CAMEO.path.headingOut * RAD, 2)
    expect(last?.y ?? 0).toBeLessThan(-200)
    expect(last?.x ?? 0).toBeGreaterThan(300)
  })
})

describe('camion du panneau : vitesse planifiée', () => {
  const plan = planSpeed(path, { v0: 0, vEnd: null, vMax: d.vMax, aMax: d.aMax, brake: d.brake, aLat: d.aLat })
  const samples = sampleMotion(path, plan, true)
  it('part de l’arrêt ; vitesse et accélération latérale bornées dans le virage', () => {
    expect(samples[0]?.v).toBe(0)
    for (const s of samples) {
      expect(s.v).toBeLessThanOrEqual(d.vMax * 1.01)
      expect(s.v * s.v * Math.abs(s.kappa)).toBeLessThanOrEqual(d.aLat * 1.15)
    }
  })
  it('accélération longitudinale bornée et sans à-coup ; distance parcourue = longueur de la trajectoire', () => {
    for (const s of samples.slice(1, -1)) expect(Math.abs(s.a)).toBeLessThanOrEqual(d.aMax * 1.1)
    expect(samples[samples.length - 1]?.s).toBeCloseTo(path[path.length - 1]?.s ?? 0, 6)
    for (let i = 1; i < samples.length; i++) expect((samples[i]?.s ?? 0) >= (samples[i - 1]?.s ?? 0)).toBe(true)
  })
  it('durée plausible d’une sortie (2 à 5 s pour 1400 unités ≈ 33 m)', () => {
    const T = samples[samples.length - 1]?.t ?? 0
    expect(T).toBeGreaterThan(2)
    expect(T).toBeLessThan(5)
  })
  it('marche arrière : arrive à l’arrêt exactement dans la baie, freinage borné', () => {
    const L = 1400
    const rev = [...path].reverse().map((p) => ({ ...p, s: L - p.s }))
    const pr = planSpeed(rev, { v0: d.vReverse, vEnd: 0, vMax: d.vReverse, aMax: d.aMax, brake: d.brake, aLat: d.aLat })
    const back = sampleMotion(path, { v: [...pr.v].reverse() }, false)
    const end = back[back.length - 1]
    expect(end?.s).toBeCloseTo(0, 0)
    expect(end?.v).toBe(0)
    for (const s of back) expect(s.v).toBeLessThanOrEqual(d.vReverse * 1.01)
    for (const s of back.slice(1, -1)) expect(Math.abs(s.a)).toBeLessThanOrEqual(d.brake * 1.15)
  })
})

describe('camion du panneau : caméra', () => {
  const cam = makeCamera()
  it('au repos : aucun déplacement, échelle 1, inclinaison 54°', () => {
    const v = project(cam, 0, 0)
    expect(v.sx).toBeCloseTo(0, 6)
    expect(v.sy).toBeCloseTo(0, 6)
    expect(v.scale).toBeCloseTo(1, 6)
    expect(v.tilt).toBeCloseTo(90 - CAMEO.camera.elevationDeg, 6)
  })
  it('en s’éloignant : plus petit, vu plus rasant, plus haut à l’écran ; à droite : azimut positif', () => {
    const v = project(cam, 300, -500)
    expect(v.scale).toBeLessThan(1)
    expect(v.tilt).toBeGreaterThan(54)
    expect(v.sy).toBeLessThan(0)
    expect(v.az).toBeGreaterThan(0)
  })
  it('images clés : même nombre pour chaque pièce, première image = pose au repos', () => {
    const plan = planSpeed(path, { v0: 0, vEnd: null, vMax: d.vMax, aMax: d.aMax, brake: d.brake, aLat: d.aLat })
    const f = buildFrames(sampleMotion(path, plan, true), cam, 1, 1)
    expect(f.yaw.length).toBe(f.mover.length)
    expect(f.mover[0]?.transform).toBe('translate(0px, 0px) scale(1)')
    expect(f.yaw[0]?.transform).toBe('rotateZ(16deg)')
    expect(f.ground[0]?.transform).toBe('rotateX(54deg)')
  })
})
