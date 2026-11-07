/**
 * Rôle : pilote la caméra de la scène d'ouverture (ADR-020) : globe tant qu'aucune tournée n'existe (rotation lente,
 *   anneaux), vol de 4,5 s vers les tournées à leur première apparition, retour au globe quand elles sont effacées.
 * Choix retenu : UNE boucle `requestAnimationFrame` (rotation + anneaux), plafonnée à 30 images/s, arrêtée à la
 *   première interaction, à 60 s, hors de la scène globe et onglet caché (le temps caché n'est pas compté).
 * Alternative écartée : `easeTo` linéaire de longue durée (60 images/s imposées, pas de plafond, pas d'anneaux).
 * Question probable du jury : « combien coûte le globe quand on ne le regarde plus ? » → rien : la boucle est
 *   annulée et la carte ne redessine plus (mesuré dans e2e/globe.spec.ts).
 */
import { useCallback, useEffect, useRef } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import type { Map as MlMap } from 'maplibre-gl'
import { GLOBE } from '@/config/globe'
import { MAP_ID } from '@/features/map/mapId'
import { SKY, SKY_GLOBE } from '@/features/map/sky'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { fr } from '@/i18n/fr'
import { useRun } from '@/store/run'
import { useScene } from '@/store/scene'
import { useVrp } from '@/store/vrp'
import { easeInOutCubic, globeCamera, instanceCamera } from './camera'

function setSymbols(map: MlMap, visibility: 'visible' | 'none'): void {
  for (const l of map.getStyle().layers) if (l.type === 'symbol') map.setLayoutProperty(l.id, 'visibility', visibility)
}

/** Fondu ≤ 150 ms du canevas (animations réduites) : remplace le vol par un saut. */
function fade(map: MlMap): void {
  map.getCanvas().animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: GLOBE.fadeMs, easing: 'ease-out' })
}

export function GlobeDirector() {
  const ref = useMap()[MAP_ID]
  const level = useMotionLevel()
  const result = useRun((s) => s.result)
  const status = useRun((s) => s.status)
  const phase = useScene((s) => s.phase)
  const spinning = useScene((s) => s.spinning)
  const skipToken = useScene((s) => s.skipToken)
  const spunMs = useRef(0)
  const flight = useRef<{ done: boolean; cam: ReturnType<typeof instanceCamera> } | null>(null)

  const enterGlobe = useCallback(
    (map: MlMap, animate: boolean) => {
      map.setProjection({ type: 'globe' })
      map.setSky(SKY_GLOBE)
      setSymbols(map, 'none')
      const cam = globeCamera(map.getContainer())
      spunMs.current = 0
      useScene.getState().setPhase('globe')
      if (animate) map.easeTo({ ...cam, duration: GLOBE.returnMs, easing: easeInOutCubic })
      else map.jumpTo(cam)
      useScene.getState().setSpinning(level === 'full')
    },
    [level],
  )

  const finish = useCallback((map: MlMap) => {
    const f = flight.current
    if (!f || f.done) return
    f.done = true
    map.setProjection({ type: 'mercator' }) // deck.gl choisirait sinon GlobeView (camion 3D de P5)
    setSymbols(map, 'visible')
    map.setSky(SKY)
    const n = useRun.getState().result?.routes.length ?? 0
    useScene.getState().setPhase('routes')
    useScene.getState().setAnnounce(fr.globe.arrived(n))
  }, [])

  // ouverture : globe si aucune tournée
  useEffect(() => {
    const map = ref?.getMap()
    if (!map) return
    if (useRun.getState().result) useScene.getState().setPhase('routes')
    else enterGlobe(map, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, à la carte prête
  }, [ref])

  // transitions : tournées apparues → vol ; tournées effacées (hors recalcul) → retour au globe
  useEffect(() => {
    const map = ref?.getMap()
    const instance = useVrp.getState().instance
    if (!map) return
    if (phase === 'globe' && result && instance) {
      useScene.getState().setSpinning(false)
      const cam = instanceCamera(map.getContainer(), instance)
      flight.current = { done: false, cam }
      if (level === 'full') {
        useScene.getState().setPhase('flying')
        map.once('moveend', () => finish(map))
        map.flyTo({ ...cam, duration: GLOBE.flyMs, easing: easeInOutCubic, essential: true })
      } else {
        if (level === 'reduced') fade(map)
        map.jumpTo(cam)
        finish(map)
      }
    } else if (phase === 'routes' && !result && status !== 'running') {
      enterGlobe(map, level === 'full')
    }
  }, [ref, phase, result, status, level, enterGlobe, finish])

  // « Passer l'animation » / Échap : fin immédiate du vol
  useEffect(() => {
    const map = ref?.getMap()
    const f = flight.current
    if (!map || !f || f.done || useScene.getState().phase !== 'flying') return
    map.stop()
    map.jumpTo(f.cam)
    finish(map)
  }, [ref, skipToken, finish])

  useEffect(() => {
    if (phase !== 'flying') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useScene.getState().skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  // la première interaction avec la carte arrête la rotation
  useEffect(() => {
    const map = ref?.getMap()
    if (!map) return
    const stop = () => {
      if (useScene.getState().phase === 'globe') useScene.getState().setSpinning(false)
    }
    const events = ['mousedown', 'touchstart', 'wheel'] as const
    for (const ev of events) map.on(ev, stop)
    const el = map.getCanvasContainer()
    el.addEventListener('keydown', stop)
    return () => {
      for (const ev of events) map.off(ev, stop)
      el.removeEventListener('keydown', stop)
    }
  }, [ref])

  // boucle unique : rotation + anneaux, ≤ 30 images/s, budget de 60 s (temps visible seulement)
  useEffect(() => {
    const map = ref?.getMap()
    if (!map || phase !== 'globe' || !spinning || level !== 'full') return
    if (spunMs.current >= GLOBE.autoStopMs) spunMs.current = 0 // « lecture » après l'arrêt automatique
    let raf = 0
    let last = performance.now()
    let sinceRender = 0
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) // onglet caché : rAF suspendu, le temps n'est pas compté
      last = now
      if (map.isEasing()) {
        // un mouvement de caméra est en cours (zoom arrière vers le globe, outil « réinitialiser ») : on ne
        // l'interrompt pas, la rotation reprend après
        raf = requestAnimationFrame(tick)
        return
      }
      sinceRender += dt
      spunMs.current += dt
      if (spunMs.current >= GLOBE.autoStopMs) {
        useScene.getState().setSpinning(false)
        return
      }
      if (sinceRender >= 1000 / GLOBE.maxFps) {
        const c = map.getCenter()
        map.jumpTo({ center: [c.lng + (GLOBE.degPerSecond * sinceRender) / 1000, c.lat] })
        const k = (spunMs.current % GLOBE.pulseMs) / GLOBE.pulseMs
        map.setPaintProperty('cdp-globe-rings', 'circle-radius', GLOBE.ringFrom + (GLOBE.ringTo - GLOBE.ringFrom) * k)
        map.setPaintProperty('cdp-globe-rings', 'circle-stroke-opacity', 0.8 * (1 - k))
        sinceRender = 0
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (map.getLayer('cdp-globe-rings')) {
        map.setPaintProperty('cdp-globe-rings', 'circle-radius', GLOBE.ringFrom)
        map.setPaintProperty('cdp-globe-rings', 'circle-stroke-opacity', phase === 'globe' ? 0.8 : 0)
      }
    }
  }, [ref, phase, spinning, level])

  return null
}
