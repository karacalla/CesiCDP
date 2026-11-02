import { BarChart3, Home, Route as RouteIcon, Share2, SlidersHorizontal, Star, Truck } from 'lucide-react'
import { Badge, Button } from '../../components/ui'
import styles from './MapHeader.module.css'

const NAV_ITEMS = [
  { label: 'Accueil', icon: Home },
  { label: 'Statistiques', icon: BarChart3 },
  { label: 'Flotte', icon: Truck },
  { label: 'Tournées', icon: RouteIcon },
  { label: 'Favoris', icon: Star },
]

/** Barre haute de la carte (logo, navigation, actions) et titre de la journée. */
export function MapHeader({ stats }) {
  return (
    <>
      <div className={styles.bar}>
        <div className={styles.left}>
          <span className={styles.brand}>CesiCDP</span>
          <nav aria-label="Navigation" className={styles.nav}>
            {NAV_ITEMS.map(({ label, icon: Icon }, i) => (
              <Button key={label} variant="ghost" active={i === 0} aria-label={label}><Icon size={16} /></Button>
            ))}
          </nav>
        </div>
        <div className={styles.actions}>
          <Button size="lg" aria-label="Filtres">
            <SlidersHorizontal size={16} />
            <Badge>3</Badge>
          </Button>
          <Button size="lg" aria-label="Exporter les feuilles de route"><Share2 size={16} /></Button>
        </div>
      </div>

      <div className={styles.title}>
        <h2 className={styles.heading}>Tournées du jour</h2>
        <p className={styles.subtitle}>{stats.routeCount} camions · {stats.stopCount} arrêts · {stats.parcels} colis</p>
      </div>
    </>
  )
}
