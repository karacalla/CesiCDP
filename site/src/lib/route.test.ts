import { describe, expect, it } from 'vitest'
import nancyInst from '@/data/nancy-60.instance.json'
import nancyRes from '@/data/nancy-60.result.json'
import { InstanceSchema, SolveResultSchema } from '@/types/vrp'
import { bearing, buildTrack, haversine, splitAt, stateAt } from './route'

const inst = InstanceSchema.parse(nancyInst)
const res = SolveResultSchema.parse(nancyRes)
const customers = new Map(inst.customers.map((c) => [c.id, c]))

describe('géométrie des tournées (affichage)', () => {
  it('distances et caps de base', () => {
    expect(haversine([6, 48], [6, 49])).toBeCloseTo(111195, -2)
    expect(bearing([6, 48], [6, 49])).toBeCloseTo(0)
    expect(bearing([6, 48], [7, 48])).toBeCloseTo(90, 0)
  })

  it('rattache les arrêts dans l’ordre et suit les horaires du solveur', () => {
    const route = res.routes[1]!
    const track = buildTrack(route, customers)!
    expect(track.stopAt).toHaveLength(route.stops.length)
    expect([...track.stopAt].sort((a, b) => a - b)).toEqual(track.stopAt) // ordre de passage croissant
    expect(stateAt(route, track, route.start! - 10)?.phase).toBe('before')
    const s0 = route.stops[0]!
    expect(stateAt(route, track, (s0.arrival! + s0.departure!) / 2)).toMatchObject({ phase: 'at-stop', nextStop: 0, distance: track.stopAt[0] })
    expect(stateAt(route, track, route.end! + 1)?.phase).toBe('returned')
    const mid = stateAt(route, track, (route.start! + s0.arrival!) / 2)!
    expect(mid.phase).toBe('driving')
    expect(mid.distance).toBeGreaterThan(0)
    expect(mid.distance).toBeLessThan(track.stopAt[0]!)
  })

  it('la découpe parcouru / à venir partage le point de coupe', () => {
    const track = buildTrack(res.routes[0]!, customers)!
    const [done, todo] = splitAt(track, 5000)
    expect(done.at(-1)).toEqual(todo[0])
    expect(done.length + todo.length).toBe(track.coords.length + 2)
  })

  it('sans horaire (sortie actuelle de resoudre), pas de position inventée', () => {
    const route = { ...res.routes[0]!, start: null, end: null }
    expect(stateAt(route, buildTrack(route, customers)!, 600)).toBeNull()
  })
})
