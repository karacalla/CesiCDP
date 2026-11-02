import { useRef, useState } from 'react'

const ORBIT_DEG_PER_SEC = 2.5
const SATELLITE_PAINT = { 'raster-brightness-max': 0.55, 'raster-saturation': -0.25 }
const FLY_TO = { zoom: 12.8, pitch: 68, duration: 2400 }

/**
 * Pilote la carte Mapbox : rotation automatique (orbite), vol vers un point, zoom.
 * `mapRef` est à passer à <Map ref>, `onLoad` à <Map onLoad>.
 */
export function useMapOrbit() {
  const mapRef = useRef(null)
  const spinning = useRef(true) // lu à chaque image par la boucle d'animation
  const [orbit, setOrbit] = useState(true) // miroir de `spinning` pour l'affichage

  const setSpinning = (value) => {
    spinning.current = value
    setOrbit(value)
  }

  const onLoad = () => {
    const map = mapRef.current?.getMap()
    if (!map) return

    try {
      Object.entries(SATELLITE_PAINT).forEach(([prop, value]) => map.setPaintProperty('satellite', prop, value))
    } catch {
      // style sans couche satellite
    }

    let frame
    let last = performance.now()
    const tick = (now) => {
      if (spinning.current && !map.isMoving()) {
        map.setBearing(map.getBearing() + ((now - last) / 1000) * ORBIT_DEG_PER_SEC)
      }
      last = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    map.once('remove', () => cancelAnimationFrame(frame))
  }

  /** Arrête l'orbite et vole vers `center` ([lng, lat]) avec un cap aléatoire. */
  const flyToPoint = (center) => {
    setSpinning(false)
    mapRef.current?.flyTo({ center, ...FLY_TO, bearing: Math.random() * 80 - 40, essential: true })
  }

  return {
    mapRef,
    orbit,
    onLoad,
    toggleOrbit: () => setSpinning(!spinning.current),
    stopOrbit: () => setSpinning(false),
    flyToPoint,
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
  }
}
