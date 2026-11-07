/**
 * Rôle : relie la machine d'états du camion du panneau à l'application (ADR-022) : déclencheurs T1–T5, réglage
 *   « Animations », lecteur WAAPI (sortie / entrée le long du trajet), annulation propre.
 * Légèreté : rien si le camion n'est pas visible à l'écran (IntersectionObserver, ≥ 50 %) ; aucune boucle d'animation ; une vérification d'inactivité toutes les 5 s (animations complètes
 *   seulement) ; `will-change` posé le temps de l'animation ; rien si l'onglet est caché ; une seule animation à la
 *   fois (file de la machine) ; un redimensionnement termine l'animation en cours (trajet recalculé au suivant).
 */
import { useEffect, useRef, useState, type RefObject } from 'react'
import { CAMEO } from '@/config/cameo'
import { BUBBLE_ID } from '@/components/layout/AppFrame'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { useRun } from '@/store/run'
import { onCameo } from './bus'
import { CameoMachine, type CameoSnapshot } from './cameoMachine'
import { flightKeyframes, flightPath, reverseKeyframes } from './flight'

export interface CameoRefs {
  bay: RefObject<HTMLDivElement | null>
  truck: RefObject<HTMLDivElement | null>
  layer: RefObject<HTMLDivElement | null>
  mover: RefObject<HTMLDivElement | null>
  path: RefObject<SVGPathElement | null>
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
      const { bay, truck, layer, mover, path } = { bay: refs.bay.current, truck: refs.truck.current, layer: refs.layer.current, mover: refs.mover.current, path: refs.path.current }
      if (levelRef.current === 'none' || document.hidden || !visible.current || !bay || !truck || !layer || !mover || !path) {
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
      const b = document.getElementById(BUBBLE_ID)?.getBoundingClientRect()
      const corner = b && b.width > 0 ? { x: b.right - 30, y: b.top + 8 } : { x: window.innerWidth - 40, y: 16 }
      path.setAttribute('d', flightPath({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, corner, window.innerWidth))
      mover.style.width = `${r.width}px`
      mover.style.height = `${r.height}px`
      const exit = flightKeyframes(path, r.width, r.height, CAMEO.exitScale)
      const duration = kind === 'exit' ? CAMEO.exitMs : CAMEO.enterMs
      layer.hidden = false
      mover.style.willChange = 'transform, opacity'
      const anim = mover.animate(kind === 'exit' ? exit : reverseKeyframes(exit), {
        duration,
        easing: kind === 'exit' ? 'cubic-bezier(0.45, 0, 0.8, 0.35)' : 'cubic-bezier(0.15, 0.6, 0.3, 1)', // démarrage lent / freinage
        fill: 'both',
      })
      const trail = path.animate([{ opacity: 0 }, { opacity: 0.7, offset: 0.35 }, { opacity: 0 }], { duration })
      running.current = anim
      const cleanup = () => {
        trail.cancel()
        anim.cancel()
        mover.style.willChange = ''
        layer.hidden = true
        running.current = null
      }
      anim.onfinish = () => {
        cleanup()
        if (kind === 'enter') {
          // léger tassement à l'arrêt (suspension), animation de 260 ms sur le camion de la baie
          truck.animate([{ transform: 'scale(1)' }, { transform: `scale(${1 + CAMEO.squash}, ${1 - CAMEO.squash})` }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' })
        }
        done()
      }
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
    const ro = new ResizeObserver(() => running.current?.finish())
    ro.observe(document.documentElement)
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
      ro.disconnect()
      io.disconnect()
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
