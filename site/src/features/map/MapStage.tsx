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
import { MAX_PITCH } from '@/config/app'
import { fr } from '@/i18n/fr'
import { tuneBasemap } from './basemapStyle'
import { RoutesLayer } from '@/features/tours/RoutesLayer'
import { CustomersLayer } from './CustomersLayer'
import { GlobeDirector } from '@/features/globe/GlobeDirector'
import { GlobeLayer } from '@/features/globe/GlobeLayer'
import { GLOBE_VIEW } from '@/config/app'
import { useScene } from '@/store/scene'
import { MAP_ID } from './mapId'
import { SKY } from './sky'



const TERRAIN = { source: 'cdp-dem', exaggeration: BASEMAP.exaggeration }
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
    map.setProjection({ type: 'globe' })
    // mesures e2e (images/s, repos du processeur) : carte exposée en développement seulement
    if (import.meta.env.DEV) (window as unknown as { cdpMapForTests?: unknown }).cdpMapForTests = map // scène d'ouverture (ADR-020) ; GlobeDirector bascule en Mercator à l'arrivée
    map.setTerrain(TERRAIN)
    // attribution repliée derrière son bouton « i » (sources complètes au clic) ; mention courte toujours visible
    map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
  }, [])
  // aria-busy : la carte annonce qu'elle charge ; sert aussi de signal aux captures automatiques
  const [ready, setReady] = useState(false)
  const onIdle = useCallback(() => setReady(true), [])
  const phase = useScene((s) => s.phase)

  return (
    <section aria-label={fr.map.label} aria-busy={!ready} className="relative h-full w-full overflow-hidden bg-bg-darker [background-image:var(--space)]">
      <Map
        onIdle={onIdle}
        id={MAP_ID}
        mapStyle={BASEMAP.styleUrl}
        initialViewState={GLOBE_VIEW}
        maxPitch={MAX_PITCH}
        // pas de fondu des libellés : sinon MapLibre redessine à chaque image pendant tout mouvement de caméra
        // (mesuré : 58 rendus/s au lieu de 37 pendant la rotation plafonnée à 30 pas/s du globe)
        fadeDuration={0}
        locale={LOCALE}
        sky={SKY}
        style={MAP_STYLE}
        attributionControl={false}
        onLoad={onLoad}
      >
        <AttributionControl position="bottom-right" compact customAttribution="© OpenStreetMap" />
        {ready && <RoutesLayer />}
        {ready && <CustomersLayer />}
        {ready && <GlobeLayer />}
        {ready && <GlobeDirector />}
      </Map>
      {/* globe « éclairé par un soleil » en haut à gauche : halo chaud et ombre portée vers le bas à droite (statique) */}
      <div aria-hidden className={`pointer-events-none absolute inset-0 transition-opacity duration-700 [background:radial-gradient(42%_38%_at_8%_6%,rgb(251_191_36/0.12),transparent_70%),radial-gradient(70%_70%_at_78%_82%,rgb(2_6_23/0.55),transparent_70%)] ${phase === 'routes' ? 'opacity-0' : 'opacity-100'}`} />
      {/* décor (ignoré par les technologies d'assistance) : nappes de nuages aux bords, voile haut, vignette forte */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(40%_28%_at_0%_8%,rgb(226_232_240/0.16),transparent_70%),radial-gradient(34%_24%_at_100%_96%,rgb(226_232_240/0.12),transparent_70%),radial-gradient(28%_20%_at_92%_0%,rgb(226_232_240/0.10),transparent_70%)] [filter:blur(18px)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-transparent via-35% to-black/40" />
      <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_50%_55%,transparent_45%,rgb(2_6_23/0.75)_100%)]" />
      {children}
    </section>
  )
}
