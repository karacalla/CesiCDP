import { CO2_PER_KM, NAIVE_ROUTE_OVERHEAD } from '../config'

const sum = (items, pick) => items.reduce((total, item) => total + pick(item), 0)

/** Chiffres clés de la flotte, calculés à partir des tournées et des arrêts. */
export const fleetStats = (routes, stops) => ({
  routeCount: routes.length,
  stopCount: stops.length,
  parcels: sum(stops, (s) => s.parcels),
  totalKm: sum(routes, (r) => r.km),
  avgLoad: Math.round(sum(routes, (r) => r.load) / routes.length),
  co2Saved: sum(routes, (r) => r.km * NAIVE_ROUTE_OVERHEAD * CO2_PER_KM),
})
