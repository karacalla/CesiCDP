import { describe, expect, it } from 'vitest'
import { ARCS, DEPOTS, globeZoom, greatCircle } from './globeData'

describe('globe : données calculées une fois', () => {
  it('arc de grand cercle : extrémités exactes, passe au nord du segment Mercator (Paris → Madrid ok, Paris → New York au nord)', () => {
    const arc = greatCircle([2.35, 48.86], [-74, 40.7])
    expect(arc[0]?.[0]).toBeCloseTo(2.35, 6)
    expect(arc.at(-1)?.[1]).toBeCloseTo(40.7, 6)
    const mid = arc[Math.floor(arc.length / 2)]
    expect(mid?.[1]).toBeGreaterThan(50) // un grand cercle transatlantique remonte vers le nord
  })
  it('12 à 14 dépôts fictifs, un seul dépôt principal', () => {
    expect(DEPOTS.features.length).toBeGreaterThanOrEqual(12)
    expect(DEPOTS.features.length).toBeLessThanOrEqual(14)
    expect(DEPOTS.features.filter((f) => f.properties?.hub).length).toBe(1)
  })
  it('arcs : au moins un par dépôt secondaire', () => {
    expect(ARCS.features.length).toBeGreaterThanOrEqual(DEPOTS.features.length - 1)
  })
  it('zoom du globe : rayon visé respecté (512 · 2^z / 2π)', () => {
    const z = globeZoom(800, 600, 0.36)
    expect((512 * 2 ** z) / (2 * Math.PI)).toBeCloseTo(0.36 * 600, 3)
  })
})
