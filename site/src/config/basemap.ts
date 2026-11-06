/**
 * Rôle : seul fichier à modifier pour changer de fond de carte et de relief (MapLibre libre ou Mapbox).
 * Choix retenu : MapLibre + style vectoriel OpenFreeMap + relief Terrarium (AWS Open Data), sans clé ni carte bancaire.
 * Alternative écartée : Mapbox par défaut (jeton obligatoire, facturation au-delà du quota gratuit).
 * Question probable du jury : « que révèle une requête de tuile ? » → la zone consultée (x/y/z), jamais les clients :
 *   les points sont dessinés localement par-dessus (voir DOSSIER_CONCEPTION §RGPD).
 */

export type BasemapProfile = 'maplibre' | 'mapbox'

export interface BasemapConfig {
  profile: BasemapProfile
  /** URL du style vectoriel (sombre). */
  styleUrl: string
  /** Source de relief en tuiles raster-dem. */
  dem: { tiles: string[]; encoding: 'terrarium' | 'mapbox'; tileSize: number; maxzoom: number; attribution: string }
  /** Exaggération verticale du relief (CLAUDE.md §3 : ≈ 1,4). */
  exaggeration: number
  /** Jeton d'accès (Mapbox uniquement). */
  accessToken?: string
}

const env = import.meta.env

const MAPLIBRE: BasemapConfig = {
  profile: 'maplibre',
  styleUrl: 'https://tiles.openfreemap.org/styles/dark',
  dem: {
    tiles: ['https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 14,
    attribution: 'Relief : Mapzen Terrain Tiles (AWS Open Data)',
  },
  exaggeration: 1.4,
}

const MAPBOX: BasemapConfig = {
  profile: 'mapbox',
  styleUrl: 'mapbox://styles/mapbox/dark-v11',
  dem: {
    tiles: ['https://api.mapbox.com/v4/mapbox.mapbox-terrain-dem-v1/{z}/{x}/{y}.pngraw'],
    encoding: 'mapbox',
    tileSize: 512,
    maxzoom: 14,
    attribution: '© Mapbox',
  },
  exaggeration: 1.4,
  accessToken: env.VITE_MAPBOX_TOKEN,
}

export const BASEMAP: BasemapConfig = env.VITE_BASEMAP === 'mapbox' && env.VITE_MAPBOX_TOKEN ? MAPBOX : MAPLIBRE
