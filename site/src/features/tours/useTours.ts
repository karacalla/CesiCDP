/**
 * Rôle : données dérivées des tournées pour l'affichage (pistes géométriques, état à l'heure affichée, statuts
 *   d'arrêt, indicateurs). Aucune donnée n'est recalculée sur le fond : on lit ce que le solveur a fourni.
 */
import { useMemo } from 'react'
import { CO2_KG_PER_KM } from '@/config/app'
import { buildTrack, stateAt, type RouteTrack, type TrackState } from '@/lib/route'
import { instanceKey, useRun } from '@/store/run'
import { useSelection } from '@/store/selection'
import { useVrp } from '@/store/vrp'
import type { Customer, Route, Stop } from '@/types/vrp'

export type StopStatus = 'ok' | 'wait' | 'late' | 'none'

export function stopStatus(s: Stop): StopStatus {
  if (s.arrival === null) return 'none'
  if ((s.late ?? 0) > 0.5) return 'late'
  if ((s.wait ?? 0) > 0.5) return 'wait'
  return 'ok'
}

export interface TourView {
  route: Route
  track: RouteTrack | null
}

export function useTours() {
  const instance = useVrp((s) => s.instance)
  const result = useRun((s) => s.result)
  const resultKey = useRun((s) => s.resultKey)
  const vehicleId = useSelection((s) => s.vehicleId)
  const clock = useSelection((s) => s.clock)

  const customers = useMemo(() => new Map<number, Customer>((instance?.customers ?? []).map((c) => [c.id, c])), [instance])
  const tours = useMemo<TourView[]>(() => (result?.routes ?? []).map((route) => ({ route, track: buildTrack(route, customers) })), [result, customers])
  const selected = tours.find((t) => t.route.vehicleId === vehicleId) ?? null
  const state: TrackState | null = selected?.track ? stateAt(selected.route, selected.track, clock) : null

  const kpis = useMemo(() => {
    if (!result || !instance) return null
    const distanceM = result.routes.reduce((s, r) => s + (r.distanceM ?? 0), 0)
    const driveMin = result.routes.reduce((s, r) => s + r.legs.reduce((a, l) => a + l.travelMin, 0), 0)
    const load = result.routes.reduce((s, r) => s + r.load, 0)
    const used = result.routes.filter((r) => r.stops.length > 0).length
    const co2 = (distanceM / 1000) * CO2_KG_PER_KM
    const co2Ref = result.comparison ? (result.comparison.distanceM / 1000) * CO2_KG_PER_KM : null
    const late = result.routes.reduce((s, r) => s + r.stops.filter((x) => stopStatus(x) === 'late').length, 0)
    return { distanceM, driveMin, used, k: instance.fleet.k, fill: used ? load / (used * instance.fleet.Q) : 0, co2, co2Ref, late }
  }, [result, instance])

  const stale = !!(result && instance && resultKey !== instanceKey(instance))
  return { instance, result, customers, tours, selected, state, kpis, stale, geo: instance?.meta.coordinates === 'geo' }
}
