import Map, { Marker, Source } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { LocateFixed } from 'lucide-react'
import { MAPBOX_TOKEN } from '../../config'
import { ROUTES, STOPS } from '../../data'
import { MapControls } from './MapControls'
import { MapHeader } from './MapHeader'
import { Pin } from './Pin'
import { RouteLayer } from './RouteLayer'
import { StopHud } from './StopHud'
import styles from './RouteMap.module.css'

const INITIAL_VIEW = { longitude: 6.86, latitude: 45.94, zoom: 11.3, pitch: 65, bearing: -25 }
const TERRAIN = { source: 'mapbox-dem', exaggeration: 1.6 }
const FOG = {
  color: 'rgb(12,20,37)', 'high-color': 'rgb(15,23,42)', 'horizon-blend': 0.2,
  'space-color': 'rgb(10,17,32)', 'star-intensity': 0.15, range: [0.5, 9],
}
const MAP_STYLE = { width: '100%', height: '100%' }
const ROUTE_COLOR = Object.fromEntries(ROUTES.map((r) => [r.id, r.color]))

/** Carte 3D des tournées avec ses repères, sa barre haute, sa fiche d'arrêt et ses contrôles. */
export function RouteMap({
  mapRef, onLoad, onDragStart, stats, route, stop, hudOpen, orbit,
  onSelectStop, onCloseHud, onToggleOrbit, onZoomIn, onZoomOut,
}) {
  return (
    <section className={styles.root}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        initialViewState={INITIAL_VIEW}
        maxPitch={80}
        terrain={TERRAIN}
        fog={FOG}
        onLoad={onLoad}
        onDragStart={onDragStart}
        style={MAP_STYLE}
      >
        <Source id="mapbox-dem" type="raster-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={512} maxzoom={14} />
        {ROUTES.map((r) => <RouteLayer key={r.id} route={r} active={r.id === route.id} />)}
        {STOPS.map((s) => (
          <Marker key={s.id} longitude={s.coord[0]} latitude={s.coord[1]} anchor="center">
            <Pin stop={s} active={s.id === stop.id} color={ROUTE_COLOR[s.route]} onClick={() => onSelectStop(s)} />
          </Marker>
        ))}
      </Map>
      <div className={styles.shade} />

      <MapHeader stats={stats} />
      <StopHud open={hudOpen} stop={stop} route={route} onClose={onCloseHud} />

      <div className={styles.arrival}>
        <LocateFixed size={14} className={styles.arrivalIcon} />Arrivée à {stop.eta}
      </div>
      <MapControls orbit={orbit} onToggleOrbit={onToggleOrbit} onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
    </section>
  )
}
