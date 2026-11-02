import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl'
import { routeToGeoJSON } from '../../lib'

const LAYOUT = { 'line-cap': 'round', 'line-join': 'round' }

/** Tracé d'une tournée sur la carte : halo + trait, mis en avant si `active`. */
export function RouteLayer({ route, active }) {
  const data = useMemo(() => routeToGeoJSON(route), [route])
  return (
    <Source id={`route-${route.id}`} type="geojson" data={data}>
      <Layer id={`glow-${route.id}`} type="line" layout={LAYOUT}
        paint={{ 'line-color': route.color, 'line-width': active ? 16 : 0, 'line-blur': 10, 'line-opacity': 0.6 }} />
      <Layer id={`core-${route.id}`} type="line" layout={LAYOUT}
        paint={{ 'line-color': route.color, 'line-width': active ? 4 : 2.5, 'line-opacity': active ? 1 : 0.45 }} />
    </Source>
  )
}
