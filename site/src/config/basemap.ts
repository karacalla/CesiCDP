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
  /** Imagerie satellite raster, désaturée et assombrie à l'affichage (identité « vue de drone »). */
  satellite: { tiles: string[]; tileSize: number; maxzoom: number; attribution: string } | null
  /** Exaggération verticale du relief (CLAUDE.md §3 : ≈ 1,4). */
  exaggeration: number
  /** Jeton d'accès (Mapbox uniquement). */
  accessToken?: string
}

const env = import.meta.env

/** Sentinel-2 cloudless 2016 (EOX) : seul millésime sous licence CC BY 4.0 (les suivants sont CC BY-NC-SA). */
const EOX_S2_2016 = {
  tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'],
  tileSize: 256,
  maxzoom: 15,
  attribution: 'Sentinel-2 cloudless 2016 © EOX IT Services (CC BY 4.0), données Copernicus Sentinel modifiées',
}

const MAPLIBRE: BasemapConfig = {
  profile: 'maplibre',
  styleUrl: 'https://tiles.openfreemap.org/styles/dark',
  satellite: EOX_S2_2016,
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
  satellite: null,
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
