import { Layer, Source } from 'react-map-gl/maplibre'
import { clientsToGeoJSON, routeToGeoJSON } from '../../lib'

const LAYOUT = { 'line-cap': 'round', 'line-join': 'round' }

// une tournée sur la carte : le trait + un point par client
export function RouteLayer({ route, active, dimmed }) {
  // pleine si sélectionnée, presque transparente si une autre est sélectionnée
  let opacity = 0.75
  if (active) opacity = 1
  if (dimmed) opacity = 0.12

  // halo flou autour de la tournée sélectionnée
  const halo = {
    'line-color': route.color,
    'line-width': active ? 14 : 0,
    'line-blur': 8,
    'line-opacity': 0.5,
  }
  // le trait de la tournée
  const trait = {
    'line-color': route.color,
    'line-width': active ? 4 : 2,
    'line-opacity': opacity,
  }
  // un point par client
  const points = {
    'circle-color': route.color,
    'circle-radius': active ? 4.5 : 2.5,
    'circle-opacity': opacity,
    'circle-stroke-color': '#0f172a',
    'circle-stroke-width': active ? 1 : 0,
  }

  return (
    <>
      <Source id={'route-' + route.id} type="geojson" data={routeToGeoJSON(route)}>
        <Layer id={'glow-' + route.id} type="line" layout={LAYOUT} paint={halo} />
        <Layer id={'core-' + route.id} type="line" layout={LAYOUT} paint={trait} />
      </Source>
      <Source id={'clients-' + route.id} type="geojson" data={clientsToGeoJSON(route)}>
        <Layer id={'dots-' + route.id} type="circle" paint={points} />
      </Source>
    </>
  )
}
