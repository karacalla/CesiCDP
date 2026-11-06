// composant principal : la carte à gauche, le tableau de bord à droite
import { useRef, useState } from 'react'
import { FRANCE_VIEW } from './config'
import { INFOS, ROUTES } from './data'
import { Dashboard } from './features/dashboard'
import { RouteMap } from './features/route-map'
import { fleetStats, routeBounds } from './lib'
import styles from './App.module.css'

// les données ne changent pas, on calcule les stats une seule fois
const STATS = fleetStats(ROUTES, INFOS)

export default function App() {
  // référence vers la carte pour pouvoir zoomer / se déplacer dessus
  const mapRef = useRef(null)
  const [route, setRoute] = useState(null) // null = on affiche toutes les tournées

  // clic sur une tournée : on la sélectionne et on zoome dessus
  function selectRoute(r) {
    setRoute(r)
    mapRef.current.fitBounds(routeBounds(r), { padding: 80, duration: 1200 })
  }

  // retour à la vue de toute la France
  function showAll() {
    setRoute(null)
    mapRef.current.flyTo({
      center: [FRANCE_VIEW.longitude, FRANCE_VIEW.latitude],
      zoom: FRANCE_VIEW.zoom,
      duration: 1200,
    })
  }

  return (
    <div className={`cdp ${styles.page}`}>
      <main className={styles.shell}>
        <RouteMap mapRef={mapRef} stats={STATS} route={route} onSelectRoute={selectRoute} onShowAll={showAll} />
        <Dashboard route={route} stats={STATS} onSelectRoute={selectRoute} onShowAll={showAll} />
      </main>
    </div>
  )
}
