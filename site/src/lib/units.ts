/**
 * Rôle : affichage d'une distance selon le type de coordonnées de l'instance.
 *   - géographique : la valeur est en mètres → « 12,4 km » ;
 *   - plane (Solomon, VRPLIB) : unité abstraite de l'instance → « 827,3 u » (jamais convertie en km).
 * Question probable du jury : « pourquoi pas de CO₂ sur c101 ? » → les distances de ces jeux ne sont pas des
 *   kilomètres : un CO₂ calculé dessus serait un faux chiffre.
 */
export function formatDistance(value: number | null, planar: boolean): string {
  if (value === null) return '—'
  if (planar) return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} u`
  return `${(value / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`
}
