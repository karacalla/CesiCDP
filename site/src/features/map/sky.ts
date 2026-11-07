/**
 * Rôle : ciel, brouillard et atmosphère de la carte. Deux variantes : vue des tournées (ciel navy à l'horizon) et
 *   scène globe (ciel transparent : le fond d'espace CSS statique, étoiles et halo solaire, apparaît autour du globe).
 */
import type { SkySpecification } from 'maplibre-gl'

export const SKY: SkySpecification = {
  'sky-color': '#0a1120',
  'horizon-color': '#1e293b',
  'fog-color': '#0f172a',
  'sky-horizon-blend': 0.6,
  'horizon-fog-blend': 0.7,
  'fog-ground-blend': 0.55,
  // atmosphère du globe (liseré bleu nuit), éteinte au-delà du zoom 7 : sans effet sur la vue des tournées
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
}

export const SKY_GLOBE: SkySpecification = { ...SKY, 'sky-color': 'rgba(10,17,32,0)', 'horizon-color': 'rgba(30,41,59,0)' }
