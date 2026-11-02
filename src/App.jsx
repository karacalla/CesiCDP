import { useEffect, useRef, useState } from 'react'
import { ROUTES, STOPS } from './data'
import { fleetStats } from './lib'
import { Dashboard } from './features/dashboard'
import { RouteMap } from './features/route-map'
import styles from './App.module.css'

const STATS = fleetStats(ROUTES, STOPS)

export default function App() {
  const mapRef = useRef(null)
  const spin = useRef(true)
  const [stopId, setStopId] = useState('s1')
  const [hudOpen, setHudOpen] = useState(true)
  const [orbit, setOrbit] = useState(true)
  const stop = STOPS.find((s) => s.id === stopId)
  const route = ROUTES.find((r) => r.id === stop.route)

  const selectStop = (s) => {
    setStopId(s.id); setHudOpen(true); spin.current = false; setOrbit(false)
    mapRef.current?.flyTo({ center: s.coord, zoom: 12.8, pitch: 68, bearing: (Math.random() * 80) - 40, duration: 2400, essential: true })
  }
  const selectRoute = (r) => selectStop(STOPS.find((s) => s.route === r.id))
  const toggleOrbit = () => { spin.current = !spin.current; setOrbit(spin.current) }
  const stopOrbit = () => { spin.current = false; setOrbit(false) }

  const onLoad = () => {
    const m = mapRef.current?.getMap(); if (!m) return
    try { m.setPaintProperty('satellite', 'raster-brightness-max', 0.55); m.setPaintProperty('satellite', 'raster-saturation', -0.25) } catch (e) { /* style sans couche satellite */ }
    let raf; let last = performance.now()
    const tick = (now) => { if (spin.current && !m.isMoving()) m.setBearing(m.getBearing() + ((now - last) / 1000) * 2.5); last = now; raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); m.once('remove', () => cancelAnimationFrame(raf))
  }

  useEffect(() => { if (mapRef.current) mapRef.current.getMap().easeTo({ pitch: 65, duration: 0 }) }, [])

  return (
    <div className={`cdp ${styles.page}`}>
      <main className={styles.shell}>
        <RouteMap
          mapRef={mapRef} onLoad={onLoad} onDragStart={stopOrbit}
          stats={STATS} route={route} stop={stop} hudOpen={hudOpen} orbit={orbit}
          onSelectStop={selectStop} onCloseHud={() => setHudOpen(false)} onToggleOrbit={toggleOrbit}
          onZoomIn={() => mapRef.current?.zoomIn()} onZoomOut={() => mapRef.current?.zoomOut()}
        />
        <Dashboard route={route} stats={STATS} onSelectRoute={selectRoute} />
      </main>
    </div>
  )
}
