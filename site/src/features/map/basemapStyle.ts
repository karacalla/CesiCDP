/**
 * Rôle : transforme le style vectoriel sombre en « vue de drone » : satellite désaturé, ombrage du relief,
 *   aplats estompés, libellés lisibles. Appliqué une fois, au chargement du style.
 * Choix retenu : retouche à l'exécution du style OpenFreeMap (aucun fichier de style à maintenir).
 * Alternative écartée : style JSON copié dans le dépôt (devient obsolète quand les tuiles évoluent).
 * Question probable du jury : « pourquoi désaturer le satellite ? » → la couleur est réservée au sens (ambre =
 *   sélection, statuts) ; un fond coloré entrerait en concurrence avec elle.
 */
import type { Map as MlMap } from 'maplibre-gl'
import { BASEMAP } from '@/config/basemap'

const SAT_SOURCE = 'cdp-satellite'
const HS_SOURCE = 'cdp-dem-hillshade'

/** Aplats masqués : ils recouvriraient l'imagerie satellite. */
const HIDDEN_FILLS = ['landcover_ice_shelf', 'landcover_glacier', 'landuse_residential', 'landcover_wood', 'landuse_park', 'aeroway-area']
/** Lignes noires du style sombre, illisibles sur le satellite (pistes d'aéroport, pointillés ferroviaires). */
const HIDDEN_LINES = ['aeroway-taxiway', 'aeroway-runway-casing', 'aeroway-runway', 'railway_transit_dashline', 'railway_minor_dashline', 'railway_dashline']
const RAIL_LINES = ['railway_transit', 'railway_minor', 'railway']
const ROAD_LINES = ['highway_minor', 'highway_major_inner', 'highway_motorway_inner', 'highway_major_subtle', 'highway_motorway_subtle']

function firstLayerAfterBackground(map: MlMap): string | undefined {
  return map.getStyle().layers.find((l) => l.type !== 'background')?.id
}

export function tuneBasemap(map: MlMap): void {
  const before = firstLayerAfterBackground(map)

  if (BASEMAP.satellite && !map.getSource(SAT_SOURCE)) {
    map.addSource(SAT_SOURCE, { type: 'raster', ...BASEMAP.satellite })
    map.addLayer(
      {
        id: 'cdp-satellite',
        type: 'raster',
        source: SAT_SOURCE,
        paint: { 'raster-saturation': -0.8, 'raster-brightness-max': 0.72, 'raster-contrast': 0.15 },
      },
      before,
    )
  }

  if (!map.getSource(HS_SOURCE)) {
    // source distincte de celle du relief : MapLibre déconseille de partager une source raster-dem
    map.addSource(HS_SOURCE, {
      type: 'raster-dem',
      tiles: BASEMAP.dem.tiles,
      encoding: BASEMAP.dem.encoding,
      tileSize: BASEMAP.dem.tileSize,
      maxzoom: BASEMAP.dem.maxzoom,
    })
    map.addLayer(
      {
        id: 'cdp-hillshade',
        type: 'hillshade',
        source: HS_SOURCE,
        paint: {
          'hillshade-shadow-color': '#000000',
          'hillshade-highlight-color': 'rgba(255,255,255,0.22)',
          'hillshade-accent-color': '#0c1425',
          'hillshade-exaggeration': 0.85,
        },
      },
      before,
    )
  }

  for (const id of [...HIDDEN_FILLS, ...HIDDEN_LINES]) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')
  for (const id of RAIL_LINES) if (map.getLayer(id)) map.setPaintProperty(id, 'line-color', 'rgba(255,255,255,0.10)')
  if (map.getLayer('water')) map.setPaintProperty('water', 'fill-opacity', 0.65)
  for (const id of ROAD_LINES) if (map.getLayer(id)) map.setPaintProperty(id, 'line-color', 'rgba(255,255,255,0.16)')

  for (const layer of map.getStyle().layers) {
    if (layer.type === 'symbol' && layer.id.startsWith('place_')) {
      map.setPaintProperty(layer.id, 'text-color', '#9aa4b2')
      map.setPaintProperty(layer.id, 'text-halo-color', 'rgba(10,17,32,0.85)')
    }
  }
}
