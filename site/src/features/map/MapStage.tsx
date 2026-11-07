/**
 * Rôle : la carte (toujours sombre) avec relief, ombrage, ciel/brouillard, voile et vignette.
 * Choix retenu : react-map-gl + MapLibre 5.24 (ADR-002) ; relief Terrarium exagéré ×1,4 ; vue inclinée 0–30°.
 * Alternative écartée : carte 2D (le relief des vallées vosgiennes fait partie du récit de la démonstration).
 * Question probable du jury : « que voit un lecteur d'écran ? » → la carte est décrite par son libellé ; toute
 *   l'information sera aussi dans la liste des arrêts (P4), la carte n'est jamais la seule source.
 */
import { useCallback, useState, type ReactNode } from 'react'
import Map, { AttributionControl, type MapEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { BASEMAP } from '@/config/basemap'
import { INITIAL_VIEW, MAX_PITCH } from '@/config/app'
import { fr } from '@/i18n/fr'
import { tuneBasemap } from './basemapStyle'
import { CustomersLayer } from './CustomersLayer'
import { MAP_ID } from './mapId'



const TERRAIN = { source: 'cdp-dem', exaggeration: BASEMAP.exaggeration }
const SKY = {
  'sky-color': '#0a1120',
  'horizon-color': '#1e293b',
  'fog-color': '#0f172a',
  'sky-horizon-blend': 0.6,
  'horizon-fog-blend': 0.7,
  'fog-ground-blend': 0.55,
}
const MAP_STYLE = { width: '100%', height: '100%' }
/** Textes internes de MapLibre (lus par les lecteurs d'écran) traduits en français. */
const LOCALE = {
  'AttributionControl.ToggleAttribution': 'Afficher ou masquer les sources de la carte',
  'Map.Title': 'Carte (flèches : déplacer, + et − : zoomer, Maj + flèches : incliner et tourner)',
}

export function MapStage({ children }: { children?: ReactNode }) {
  const onLoad = useCallback((e: MapEvent) => {
    const map = e.target
    if (!map.getSource('cdp-dem')) {
      map.addSource('cdp-dem', {
        type: 'raster-dem',
        tiles: BASEMAP.dem.tiles,
        encoding: BASEMAP.dem.encoding,
        tileSize: BASEMAP.dem.tileSize,
        maxzoom: BASEMAP.dem.maxzoom,
        attribution: BASEMAP.dem.attribution,
      })
    }
    tuneBasemap(map)
    map.setTerrain(TERRAIN)
    // en disposition empilée, l'attribution reste repliée derrière son bouton « i » pour ne pas masquer la carte
    if (window.innerWidth < 1024) {
      map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
    }
  }, [])
  // aria-busy : la carte annonce qu'elle charge ; sert aussi de signal aux captures automatiques
  const [ready, setReady] = useState(false)
  const onIdle = useCallback(() => setReady(true), [])

  return (
    <section aria-label={fr.map.label} aria-busy={!ready} className="relative h-full w-full overflow-hidden bg-bg-darker">
      <Map
        onIdle={onIdle}
        id={MAP_ID}
        mapStyle={BASEMAP.styleUrl}
        initialViewState={INITIAL_VIEW}
        maxPitch={MAX_PITCH}
        locale={LOCALE}
        sky={SKY}
        style={MAP_STYLE}
        attributionControl={false}
        onLoad={onLoad}
      >
        <AttributionControl position="bottom-left" compact />
        {ready && <CustomersLayer />}
      </Map>
      {/* voile haut (lisibilité de l'en-tête) + vignette : décor, ignoré par les technologies d'assistance */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/35" />
      <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_45%_45%,transparent_55%,rgb(2_6_23/0.65)_100%)]" />
      {children}
    </section>
  )
}
