// partie gauche de la page : la carte avec les tournées et le dépôt
// on utilise MapLibre (gratuit, pas besoin de clé comme Mapbox)
import Map, { AttributionControl, Marker } from 'react-map-gl/maplibre'
import { setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { FRANCE_VIEW, MAP_STYLE_URL } from '../../config'
import { DEPOT, ROUTES } from '../../data'
import { MapControls } from './MapControls'
import { MapHeader } from './MapHeader'
import { Pin } from './Pin'
import { RouteHud } from './RouteHud'
import { RouteLayer } from './RouteLayer'
import styles from './RouteMap.module.css'

// sans ça Vite ne trouve pas le worker de maplibre
setWorkerUrl(workerUrl)

const MAP_SIZE = { width: '100%', height: '100%' }
// les traits des tournées sont cliquables (voir RouteLayer)
const CLICKABLE_LAYERS = ROUTES.map((r) => 'core-' + r.id)

export function RouteMap({ mapRef, stats, route, onSelectRoute, onShowAll }) {
  // si on clique sur un trait, on récupère le numéro de la tournée dans l'id du calque
  function handleClick(event) {
    if (!event.features || event.features.length === 0) return
    const id = Number(event.features[0].layer.id.replace('core-', ''))
    onSelectRoute(ROUTES.find((r) => r.id === id))
  }

  return (
    <section className={styles.root}>
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE_URL}
        initialViewState={FRANCE_VIEW}
        interactiveLayerIds={CLICKABLE_LAYERS}
        onClick={handleClick}
        style={MAP_SIZE}
        attributionControl={false}
      >
        {/* crédits OpenStreetMap obligatoires, en bas à gauche */}
        <AttributionControl position="bottom-left" compact />
        {/* une couche par tournée, les autres sont estompées si une est sélectionnée */}
        {ROUTES.map((r) => (
          <RouteLayer
            key={r.id}
            route={r}
            active={route !== null && r.id === route.id}
            dimmed={route !== null && r.id !== route.id}
          />
        ))}
        {/* le dépôt */}
        <Marker longitude={DEPOT.coord[0]} latitude={DEPOT.coord[1]} anchor="center">
          <Pin label={DEPOT.nom} />
        </Marker>
      </Map>
      <div className={styles.shade} />

      {/* éléments affichés par-dessus la carte */}
      <MapHeader stats={stats} />
      {route && <RouteHud route={route} onClose={onShowAll} />}
      <MapControls
        onZoomIn={() => mapRef.current.zoomIn()}
        onZoomOut={() => mapRef.current.zoomOut()}
        onShowAll={onShowAll}
      />
    </section>
  )
}
