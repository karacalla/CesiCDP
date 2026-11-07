/**
 * Rôle : tracés sur la carte, en couches natives drapées sur le relief (ADR-003).
 *   - autres camions : blanc 45 %, fins ;
 *   - camion sélectionné, deux états : PARCOURU = ambre plein épais ; À VENIR = blanc pointillé posé sur un
 *     contour sombre plus large (effet « route »).
 * Recadrage « drone » à la sélection : inclinaison 20°, carte tournée pour que le trajet monte vers le haut.
 */
import { useEffect, useMemo } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'
import type { Feature, FeatureCollection, LineString } from 'geojson'
import { CAMERA_MS, DRONE_PITCH } from '@/config/app'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { bearing, splitAt, type LngLat } from '@/lib/route'
import { labelLayerId, MAP_ID } from '@/features/map/mapId'
import { useSelection } from '@/store/selection'
import { useTours } from './useTours'

const line = (coords: LngLat[], props: Record<string, unknown> = {}): Feature<LineString> => ({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: coords } })
const EMPTY: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] }


export function RoutesLayer() {
  const { tours, selected, state, geo } = useTours()
  const map = useMap()[MAP_ID]
  const selectVehicle = useSelection((s) => s.selectVehicle)
  const reduced = usePrefersReducedMotion()
  const before = labelLayerId(map)

  const others = useMemo<FeatureCollection<LineString>>(
    () => ({ type: 'FeatureCollection', features: tours.filter((t) => t !== selected && t.track).map((t) => line(t.track?.coords ?? [], { vehicleId: t.route.vehicleId })) }),
    [tours, selected],
  )
  const [done, todo] = useMemo(() => {
    if (!selected?.track) return [EMPTY, EMPTY]
    const [a, b] = splitAt(selected.track, state?.distance ?? 0)
    return [{ type: 'FeatureCollection', features: a.length > 1 && (state?.distance ?? 0) > 0 ? [line(a)] : [] }, { type: 'FeatureCollection', features: b.length > 1 ? [line(b)] : [] }] as const
  }, [selected, state?.distance])

  // clic sur un autre tracé = sélection de ce camion
  useEffect(() => {
    if (!map) return
    const onClick = (e: { features?: Array<{ properties: Record<string, unknown> }> }): void => {
      const id = Number(e.features?.[0]?.properties.vehicleId)
      if (Number.isFinite(id)) selectVehicle(id)
    }
    const enter = (): void => void (map.getCanvas().style.cursor = 'pointer')
    const leave = (): void => void (map.getCanvas().style.cursor = '')
    map.on('click', 'cdp-routes-others', onClick)
    map.on('mouseenter', 'cdp-routes-others', enter)
    map.on('mouseleave', 'cdp-routes-others', leave)
    return () => {
      map.off('click', 'cdp-routes-others', onClick)
      map.off('mouseenter', 'cdp-routes-others', enter)
      map.off('mouseleave', 'cdp-routes-others', leave)
    }
  }, [map, selectVehicle])

  // recadrage : le trajet « monte » (cap du dépôt vers le point le plus éloigné), vue de drone
  const selectedId = selected?.route.vehicleId
  useEffect(() => {
    const coords = selected?.track?.coords
    if (!map || !coords || coords.length < 2) return
    const start = coords[0] as LngLat
    let far = start
    let w = start[0], e = start[0], s = start[1], n = start[1]
    for (const p of coords) {
      w = Math.min(w, p[0]); e = Math.max(e, p[0]); s = Math.min(s, p[1]); n = Math.max(n, p[1])
      if (Math.hypot(p[0] - start[0], p[1] - start[1]) > Math.hypot(far[0] - start[0], far[1] - start[1])) far = p
    }
    // marges : la carte d'info occupe le bas à gauche quand la carte est large
    const el = map.getContainer()
    const wide = el.clientWidth > 700 && el.clientHeight > 520
    const padding = wide ? { top: 150, bottom: 230, left: 380, right: 110 } : { top: 110, bottom: 60, left: 40, right: 70 }
    map.fitBounds([[w, s], [e, n]], { bearing: bearing(start, far), pitch: DRONE_PITCH, padding, duration: reduced ? 0 : CAMERA_MS, maxZoom: 13 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recadrage au seul changement de camion
  }, [map, selectedId])

  if (!geo) return null
  return (
    <>
      <Source id="cdp-routes-others" type="geojson" data={others}>
        <Layer id="cdp-routes-others" type="line" beforeId={before} layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': 'rgba(255,255,255,0.45)', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 13, 3] }} />
      </Source>
      <Source id="cdp-route-todo" type="geojson" data={todo}>
        <Layer id="cdp-route-todo-casing" type="line" beforeId={before} layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': 'rgba(2,6,23,0.7)', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 6, 13, 10] }} />
        <Layer id="cdp-route-todo" type="line" beforeId={before} layout={{ 'line-cap': 'butt', 'line-join': 'round' }} paint={{ 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 13, 3.5], 'line-dasharray': [1.5, 1.6] }} />
      </Source>
      <Source id="cdp-route-done" type="geojson" data={done}>
        <Layer id="cdp-route-done" type="line" beforeId={before} layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#f59e0b', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 13, 7] }} />
      </Source>
    </>
  )
}
