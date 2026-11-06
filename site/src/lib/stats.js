import { CO2_PER_KM } from '../config'

// chiffres clés affichés dans le tableau de bord
export function fleetStats(routes, infos) {
  // on additionne les clients et la charge de toutes les tournées
  let nbClients = 0
  let chargeTotale = 0
  for (const r of routes) {
    nbClients += r.clients.length
    chargeTotale += r.charge
  }

  // km gagnés par le recuit par rapport à la solution de départ
  const gainKm = infos.kmDepart - infos.kmTotal

  return {
    routeCount: routes.length,
    stopCount: nbClients,
    totalKm: infos.kmTotal,
    kmDepart: infos.kmDepart,
    gainKm: gainKm,
    gainPct: (gainKm / infos.kmDepart) * 100,
    // remplissage moyen = charge totale / capacité totale
    avgLoad: Math.round((chargeTotale / (routes.length * infos.capacite)) * 100),
    // CO2 estimé en kg (km x facteur)
    co2Total: infos.kmTotal * CO2_PER_KM,
    co2Saved: gainKm * CO2_PER_KM,
    dureeCalcul: infos.dureeCalcul,
  }
}
