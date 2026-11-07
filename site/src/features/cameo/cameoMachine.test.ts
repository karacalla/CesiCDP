import { describe, expect, it } from 'vitest'
import { CAMEO } from '@/config/cameo'
import { CameoMachine, type CameoSnapshot } from './cameoMachine'

/** Horloge simulée + lecteur qui enregistre les animations et les termine sur demande. */
function harness() {
  let t = 0
  const timers: Array<{ at: number; fn: () => void; live: boolean }> = []
  const played: string[] = []
  let finish: (() => void) | null = null
  const states: CameoSnapshot[] = []
  const m = new CameoMachine({
    now: () => t,
    setTimer: (fn, ms) => {
      const timer = { at: t + ms, fn, live: true }
      timers.push(timer)
      return () => void (timer.live = false)
    },
    play: (kind, v, done) => {
      played.push(`${kind}:${v}`)
      finish = done
      return () => void (finish = null)
    },
    onChange: (s) => states.push(s),
  })
  const advance = (ms: number) => {
    t += ms
    for (const tm of timers) if (tm.live && tm.at <= t) { tm.live = false; tm.fn() }
  }
  const end = () => { const f = finish; finish = null; f?.() }
  return { m, played, states, advance, end, animating: () => finish !== null }
}

const idle = { busy: false, hidden: false, full: true }

describe('camion du panneau : machine d’états', () => {
  it('T4 : première apparition des tournées → une entrée depuis le coin, une seule fois', () => {
    const h = harness()
    h.m.firstRoutes(1)
    expect(h.played).toEqual(['enter:1'])
    expect(h.m.snapshot().state).toBe('entering')
    h.end()
    expect(h.m.snapshot()).toEqual({ state: 'home', vehicleId: 1 })
    h.m.firstRoutes(1)
    expect(h.played).toEqual(['enter:1'])
  })

  it('T1 : changement de camion → l’ancien sort puis le nouveau entre, jamais deux animations à la fois', () => {
    const h = harness()
    h.m.select(1)
    expect(h.played).toEqual([])
    h.m.select(2)
    expect(h.played).toEqual(['exit:1'])
    h.m.select(3) // clic rapide : l'entrée en attente est remplacée
    expect(h.played).toEqual(['exit:1'])
    h.end()
    expect(h.played).toEqual(['exit:1', 'enter:3'])
    h.end()
    expect(h.m.snapshot()).toEqual({ state: 'home', vehicleId: 3 })
  })

  it('T2 / T3 : la simulation fait partir le camion et le ramène', () => {
    const h = harness()
    h.m.select(2)
    h.m.simulationStart()
    h.end()
    expect(h.m.snapshot().state).toBe('away')
    h.m.simulationStart() // déjà parti : sans effet
    expect(h.played).toEqual(['exit:2'])
    h.m.simulationEnd()
    expect(h.played).toEqual(['exit:2', 'enter:2'])
    h.end()
    expect(h.m.snapshot().state).toBe('home')
  })

  it('T5 : passage de démonstration après 120 s d’inactivité, absence de 20 s, au plus un par 10 min', () => {
    const h = harness()
    h.m.select(1)
    h.advance(CAMEO.idleMs - 1)
    expect(h.m.checkIdle(idle)).toBe(false)
    h.advance(1)
    expect(h.m.checkIdle(idle)).toBe(true)
    expect(h.played).toEqual(['exit:1'])
    h.end()
    expect(h.m.snapshot().state).toBe('away')
    h.advance(CAMEO.demoAbsentMs - 1)
    expect(h.played).toEqual(['exit:1'])
    h.advance(1)
    expect(h.played).toEqual(['exit:1', 'enter:1'])
    h.end()
    h.advance(CAMEO.idleMs) // toujours inactif, mais délai de 10 min non écoulé
    expect(h.m.checkIdle(idle)).toBe(false)
    h.advance(CAMEO.demoCooldownMs)
    expect(h.m.checkIdle(idle)).toBe(true)
  })

  it('T5 : jamais pendant un calcul, une simulation, onglet caché ou animations réduites ; l’activité remet à zéro', () => {
    const h = harness()
    h.m.select(1)
    h.advance(CAMEO.idleMs)
    expect(h.m.checkIdle({ ...idle, busy: true })).toBe(false)
    expect(h.m.checkIdle({ ...idle, hidden: true })).toBe(false)
    expect(h.m.checkIdle({ ...idle, full: false })).toBe(false)
    h.m.activity()
    h.advance(CAMEO.idleMs - 10)
    expect(h.m.checkIdle(idle)).toBe(false)
    expect(h.played).toEqual([])
  })

  it('« Rejouer l’animation » : passage immédiat, ignoré si une animation est en cours', () => {
    const h = harness()
    h.m.select(4)
    h.m.replay()
    expect(h.played).toEqual(['exit:4'])
    h.m.replay()
    expect(h.played).toEqual(['exit:4'])
    h.m.dispose()
    expect(h.animating()).toBe(false)
  })
})
