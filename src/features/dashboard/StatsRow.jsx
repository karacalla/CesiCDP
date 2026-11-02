import { StatTile } from '../../components/ui'
import { formatNumber } from '../../lib'
import styles from './StatsRow.module.css'

/** Distance, colis et remplissage moyen. */
export function StatsRow({ stats }) {
  return (
    <section className={styles.root}>
      <StatTile label="Distance" value={formatNumber(stats.totalKm, 1)} unit="km" />
      <StatTile label="Colis" value={stats.parcels} unit="livrés" />
      <StatTile label="Remplissage" value={stats.avgLoad} unit="%" />
    </section>
  )
}
