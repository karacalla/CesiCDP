// formats GeoJSON demandés par la carte

// tracé d'une tournée -> une ligne
export function routeToGeoJSON(route) {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: route.coords },
  }
}

// clients d'une tournée -> un point par client
export function clientsToGeoJSON(route) {
  const points = route.clients.map((c) => ({
    type: 'Feature',
    properties: { nom: c.nom, demande: c.demande },
    geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
  }))
  return { type: 'FeatureCollection', features: points }
}

// rectangle qui contient toute la tournée, pour zoomer dessus
export function routeBounds(route) {
  const lngs = route.coords.map((c) => c[0])
  const lats = route.coords.map((c) => c[1])
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}
