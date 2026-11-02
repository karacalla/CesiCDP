/** Route -> Feature GeoJSON (LineString) pour une source Mapbox. */
export const routeToGeoJSON = (route) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: route.coords },
})
