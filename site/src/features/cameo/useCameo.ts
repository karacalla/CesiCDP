/**
 * Rôle : relie la machine d'états du camion du panneau à l'application (ADR-022) : déclencheurs T1–T5, réglage
 *   « Animations », lecteur WAAPI (sortie / entrée le long du trajet), annulation propre.
 * Légèreté : rien si le camion n'est pas visible à l'écran (IntersectionObserver, ≥ 50 %) ; aucune boucle d'animation ; une vérification d'inactivité toutes les 5 s (animations complètes
 *   seulement) ; `will-change` posé le temps de l'animation ; rien si l'onglet est caché ; une seule animation à la
 *   fois (file de la machine) ; un redimensionnement de la fenêtre termine l'animation en cours.
 */
import { useEffect, useRef, useState, type RefObject } from 'react'
import { CAMEO } from '@/config/cameo'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { useRun } from '@/store/run'
import { onCameo } from './bus'
import { CameoMachine, type CameoSnapshot } from './cameoMachine'
import { TRUCK } from '@/features/truck3d/geometry'
import { buildFrames, type PartFrames } from './keyframes'
import { exitPath, makeCamera, planSpeed, project, sampleMotion, type PathPoint } from './motion'

export interface CameoRefs {
  bay: RefObject<HTMLDivElement | null>
  truck: RefObject<HTMLDivElement | null>
  layer: RefObject<HTMLDivElement | null>
  mover: RefObject<HTMLDivElement | null>
}


const RAD = Math.PI / 180

/**
 * Trajectoire, vitesses et images clés d'une sortie (marche avant depuis l'arrêt) ou d'un retour (marche arrière
 * depuis hors de l'écran jusqu'à l'arrêt dans la baie). La trajectoire est coupée dès que le camion entier a quitté
 * l'écran (position projetée de l'essieu arrière + longueur apparente du camion).
 */
function planFlight(kind: 'exit' | 'enter', unit: number, anchor: { x: number; y: number }): PartFrames {
  const cam = makeCamera()
  const full = exitPath(TRUCK.rest.psi * RAD, 3200)
  let end = full.length - 1
  for (let i = 0; i < full.length; i++) {
    const p = full[i] as PathPoint
    const v = project(cam, p.x, p.y)
    const x = anchor.x + v.sx * unit
    const y = anchor.y + v.sy * unit
    // camion entièrement sorti : l'essieu arrière dépasse le bord du porte-à-faux arrière + la demi-largeur
    const margin = TRUCK.offscreenMargin * unit * v.scale
    if (x > window.innerWidth + margin || x < -margin || y < -margin || y > window.innerHeight + margin) {
      end = i
      break
    }
  }
  const path = full.slice(0, end + 1)
  const d = CAMEO.dyn
  if (kind === 'exit') {
    const plan = planSpeed(path, { v0: 0, vEnd: null, vMax: d.vMax, aMax: d.aMax, brake: d.brake, aLat: d.aLat })
    return buildFrames(sampleMotion(path, plan, true), cam, 1, unit)
  }
  // marche arrière : on planifie sur la trajectoire parcourue à l'envers (vitesse de manœuvre, arrêt en douceur)
  const L = path[path.length - 1]?.s ?? 0
  const rev = [...path].reverse().map((p) => ({ ...p, s: L - p.s }))
  const planRev = planSpeed(rev, { v0: d.vReverse, vEnd: 0, vMax: d.vReverse, aMax: d.aMax, brake: d.brake, aLat: d.aLat })
  const plan = { v: [...planRev.v].reverse() }
  return buildFrames(sampleMotion(path, plan, false), cam, -1, unit)
}

/** Lance une animation WAAPI par pièce `data-part` du camion (même durée, temps linéaire). */
function applyFrames(root: HTMLElement, f: PartFrames): Animation[] {
  root.style.willChange = 'transform'
  const opts: KeyframeAnimationOptions = { duration: f.duration, fill: 'both', easing: 'linear' }
  const anims: Animation[] = [root.animate(f.mover, opts)]
  const parts: Array<[string, Keyframe[]]> = [
    ['ground', f.ground], ['yaw', f.yaw], ['shadow', f.shadow], ['body', f.body], ['rim', f.rim], ['steer', f.steer],
    ['glare', f.glare], ['headlights', f.headlights], ['beams', f.beams], ['brake', f.brake], ['reverse', f.reverse],
  ]
  // une valeur qui ne change pas (feu éteint, toit) est posée telle quelle : pas d'animation inutile
  const run = (el: HTMLElement, kf: Keyframe[]) => {
    const first = JSON.stringify({ ...kf[0], offset: 0 })
    if (kf.every((k) => JSON.stringify({ ...k, offset: 0 }) === first)) {
      const k = kf[0] ?? {}
      if (typeof k.opacity === 'number') el.style.opacity = String(k.opacity)
      if (typeof k.transform === 'string') el.style.transform = k.transform
    } else anims.push(el.animate(kf, opts))
  }
  for (const [name, kf] of parts) root.querySelectorAll<HTMLElement>(`[data-part="${name}"]`).forEach((el) => run(el, kf))
  for (const [face, kf] of Object.entries(f.shade)) root.querySelectorAll<HTMLElement>(`[data-shade="${face}"]`).forEach((el) => run(el, kf))
  return anims
}

/** Résultat pour lequel l'entrée T4 a déjà été jouée (la vue Tournées se remonte à chaque changement de vue). */
let introducedFor: unknown = null

export function useCameo(vehicleId: number | null, refs: CameoRefs): CameoSnapshot {
  const level = useMotionLevel()
  const result = useRun((s) => s.result)
  const [snap, setSnap] = useState<CameoSnapshot>({ state: introducedFor === result ? 'home' : 'away', vehicleId })
  const machine = useRef<CameoMachine | null>(null)
  const levelRef = useRef(level)
  const simulating = useRef(false)
  const running = useRef<Animation | null>(null)
  /** Baie visible à au moins 50 % : sinon l'animation est inutile (personne ne la voit) et n'est pas jouée. */
  const visible = useRef(true)

  useEffect(() => {
    levelRef.current = level
  }, [level])

  useEffect(() => {
    const play = (kind: 'exit' | 'enter', _v: number, done: () => void): (() => void) => {
      const { bay, truck, layer, mover } = { bay: refs.bay.current, truck: refs.truck.current, layer: refs.layer.current, mover: refs.mover.current }
      if (levelRef.current === 'none' || document.hidden || !visible.current || !bay || !truck || !layer || !mover) {
        const id = window.setTimeout(done, 0)
        return () => window.clearTimeout(id)
      }
      if (levelRef.current === 'reduced') {
        const a = truck.animate(kind === 'exit' ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: CAMEO.fadeMs, fill: 'forwards' })
        a.onfinish = () => {
          a.cancel()
          done()
        }
        return () => a.cancel()
      }
      const r = bay.getBoundingClientRect()
      const anchor = bay.querySelector('[data-part="anchor"]')?.getBoundingClientRect()
      if (!anchor || r.width === 0) {
        const id = window.setTimeout(done, 0)
        return () => window.clearTimeout(id)
      }
      mover.style.left = `${r.left}px`
      mover.style.top = `${r.top}px`
      mover.style.width = `${r.width}px`
      mover.style.height = `${r.height}px`
      mover.style.transformOrigin = `${anchor.left - r.left}px ${anchor.top - r.top}px`
      performance.mark('cameo-start')
      const frames = planFlight(kind, r.width / TRUCK.frame, { x: anchor.left, y: anchor.top })
      performance.measure('cameo-plan', 'cameo-start')
      // animations créées AVANT d'afficher la couche : un seul calcul de style, au lieu d'un par animation
      const anims = applyFrames(mover, frames)
      layer.hidden = false
      performance.measure('cameo-apply', 'cameo-start')
      running.current = anims[0] ?? null
      const cleanup = () => {
        anims.forEach((a) => a.cancel())
        mover.style.willChange = ''
        layer.hidden = true
        running.current = null
      }
      const first = anims[0]
      if (first) {
        first.onfinish = () => {
          cleanup()
          done()
        }
      } else window.setTimeout(done, 0)
      return cleanup
    }
    const m = new CameoMachine({
      now: () => performance.now(),
      setTimer: (fn, ms) => {
        const id = window.setTimeout(fn, ms)
        return () => window.clearTimeout(id)
      },
      play,
      onChange: setSnap,
    })
    machine.current = m
    const r = useRun.getState().result
    if (vehicleId !== null) {
      if (r && introducedFor !== r) {
        introducedFor = r
        m.firstRoutes(vehicleId) // T4
      } else m.select(vehicleId)
    }
    const offs = [
      onCameo('replay', () => m.replay()),
      onCameo('simulation-start', () => {
        simulating.current = true
        m.simulationStart() // T2
      }),
      onCameo('simulation-end', () => {
        simulating.current = false
        m.simulationEnd() // T3
      }),
    ]
    const act = () => m.activity()
    for (const ev of ['pointerdown', 'keydown', 'wheel'] as const) window.addEventListener(ev, act, { passive: true })
    // redimensionnement de la fenêtre : l'animation en cours se termine (le trajet est recalculé au suivant)
    const onResize = () => running.current?.finish()
    window.addEventListener('resize', onResize)
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = (e?.intersectionRatio ?? 0) >= 0.5
        if (!visible.current) running.current?.finish() // sortie de l'écran pendant l'animation : on termine
      },
      { threshold: [0, 0.5, 1] },
    )
    if (refs.bay.current) io.observe(refs.bay.current)
    return () => {
      offs.forEach((off) => off())
      for (const ev of ['pointerdown', 'keydown', 'wheel'] as const) window.removeEventListener(ev, act)
      window.removeEventListener('resize', onResize)
      io.disconnect()
      // entrée T4 interrompue (démontage, double montage du mode strict) : elle sera rejouée au prochain montage
      if (m.snapshot().state !== 'home' && introducedFor === useRun.getState().result) introducedFor = null
      m.dispose()
      machine.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une machine par montage ; le camion suit via l'effet T1
  }, [])

  // T1 : changement de camion sélectionné
  useEffect(() => {
    if (vehicleId !== null) machine.current?.select(vehicleId)
  }, [vehicleId])

  // T5 : passage de démonstration (vérification périodique, animations complètes seulement)
  useEffect(() => {
    if (level !== 'full') return
    const id = window.setInterval(() => {
      machine.current?.checkIdle({ busy: useRun.getState().status === 'running' || simulating.current, hidden: document.hidden || !visible.current, full: levelRef.current === 'full' })
    }, CAMEO.idleCheckMs)
    return () => window.clearInterval(id)
  }, [level])

  return snap
}
