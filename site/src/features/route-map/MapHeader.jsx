import { formatNumber } from '../../lib'
import styles from './MapHeader.module.css'

// titre en haut de la carte
export function MapHeader({ stats }) {
  return (
    <>
      <div className={styles.bar}>
        <span className={styles.brand}>CesiCDP</span>
      </div>

      <div className={styles.title}>
        <h2 className={styles.heading}>Tournées calculées</h2>
        <p className={styles.subtitle}>
          {stats.routeCount} camions · {stats.stopCount} clients · {formatNumber(stats.totalKm)} km
        </p>
      </div>
    </>
  )
}
