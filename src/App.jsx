import { useState } from 'react'
import { ROUTES, STOPS } from './data'
import { Dashboard } from './features/dashboard'
import { RouteMap } from './features/route-map'
import { useMapOrbit } from './hooks'
import { fleetStats } from './lib'
import styles from './App.module.css'

const STATS = fleetStats(ROUTES, STOPS)

export default function App() {
  const map = useMapOrbit()
  const [stopId, setStopId] = useState('s1')
  const [hudOpen, setHudOpen] = useState(true)
  const stop = STOPS.find((s) => s.id === stopId)
  const route = ROUTES.find((r) => r.id === stop.route)

  const selectStop = (s) => {
    setStopId(s.id)
    setHudOpen(true)
    map.flyToPoint(s.coord)
  }
  const selectRoute = (r) => selectStop(STOPS.find((s) => s.route === r.id))

  return (
    <div className={`cdp ${styles.page}`}>
      <main className={styles.shell}>
        <RouteMap
          mapRef={map.mapRef} onLoad={map.onLoad} onDragStart={map.stopOrbit}
          stats={STATS} route={route} stop={stop} hudOpen={hudOpen} orbit={map.orbit}
          onSelectStop={selectStop} onCloseHud={() => setHudOpen(false)} onToggleOrbit={map.toggleOrbit}
          onZoomIn={map.zoomIn} onZoomOut={map.zoomOut}
        />
        <Dashboard route={route} stats={STATS} onSelectRoute={selectRoute} />
      </main>
    </div>
  )
}
