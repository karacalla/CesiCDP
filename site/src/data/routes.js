// tournees.json est généré par algorithme/gen_carte.py
import donnees from './tournees.json'

// infos générales sur le calcul (affichées dans les stats)
export const INFOS = {
  nom: donnees.nom,
  capacite: donnees.capacite,
  nbClients: donnees.nb_clients,
  kmDepart: donnees.km_depart, // solution de départ (Clarke et Wright)
  kmTotal: donnees.km_total, // après le recuit
  dureeCalcul: donnees.duree_calcul_s,
}

// point de départ et d'arrivée de tous les camions
export const DEPOT = {
  nom: donnees.depot.nom,
  coord: [donnees.depot.lon, donnees.depot.lat],
}

// une couleur différente par camion : on tourne de 137° sur la roue des couleurs
function couleur(id) {
  return `hsl(${(id * 137) % 360}, 85%, 62%)`
}

// une entrée par camion
// coords = tracé [longitude, latitude] : dépôt -> clients -> dépôt
export const ROUTES = donnees.tournees.map((t) => {
  const points = t.clients.map((c) => [c.lon, c.lat])
  return {
    id: t.id,
    name: `Camion ${t.id}`,
    color: couleur(t.id),
    km: t.km,
    charge: t.charge,
    // remplissage du camion en %
    load: Math.round((t.charge / donnees.capacite) * 100),
    clients: t.clients,
    coords: [DEPOT.coord, ...points, DEPOT.coord],
  }
})
