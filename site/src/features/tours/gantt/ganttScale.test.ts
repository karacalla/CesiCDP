import { describe, expect, it } from 'vitest'
import type { Route } from '@/types/vrp'
import { dayDomain, panDomain, ticks, transformBetween, zoomDomain, MIN_SPAN } from './ganttScale'

const route = (start: number, end: number): Route => ({
  vehicleId: 1, load: 0, distanceM: null, geometry: null, start, end, legs: [],
  stops: [{ customerId: 1, arrival: start + 10, wait: 0, departure: start + 20, late: 0 }],
})

describe('ganttScale', () => {
  it('emprise arrondie à l’heure, du premier départ au dernier retour', () => {
    expect(dayDomain([route(485, 700), route(470, 905)])).toEqual([420, 960])
    expect(dayDomain([])).toBeNull()
  })
  it('zoom borné : jamais sous MIN_SPAN ni hors de la journée', () => {
    const full = [420, 960] as const
    const d = zoomDomain(full, full, 100, 600)
    expect(d[1] - d[0]).toBe(MIN_SPAN)
    expect(zoomDomain(full, full, 0.1, 600)).toEqual(full)
    const z = zoomDomain(full, full, 2, 420)
    expect(z[0]).toBe(420)
  })
  it('déplacement borné aux extrémités', () => {
    expect(panDomain([420, 600], [420, 960], -100)).toEqual([420, 600])
    expect(panDomain([420, 600], [420, 960], 1000)).toEqual([780, 960])
  })
  it('graduations régulières, en nombre limité par la largeur', () => {
    expect(ticks([420, 960], 400)).toEqual([480, 600, 720, 840, 960])
    expect(ticks([600, 660], 400)).toEqual([600, 615, 630, 645, 660])
  })
  it('la transformation SVG reproduit le changement d’emprise', () => {
    const from = [420, 960] as const
    const to = [600, 720] as const
    const [x0, x1] = [80, 480]
    const px = (t: number, d: readonly [number, number]) => x0 + ((t - d[0]) / (d[1] - d[0])) * (x1 - x0)
    const { k, tx } = transformBetween(from, to, x0, x1)
    for (const t of [600, 650, 720]) expect(k * px(t, from) + tx).toBeCloseTo(px(t, to), 6)
  })
})
