import { StatTile } from '../../components/ui'
import { formatNumber } from '../../lib'
import styles from './StatsRow.module.css'

// grille des chiffres clés
export function StatsRow({ stats }) {
  return (
    <section className={styles.root}>
      <StatTile label="Distance totale" value={formatNumber(stats.totalKm)} unit="km" />
      <StatTile label="Camions" value={stats.routeCount} unit="tournées" />
      <StatTile label="Clients" value={stats.stopCount} unit="livrés" />
      <StatTile label="Départ (Clarke et Wright)" value={formatNumber(stats.kmDepart)} unit="km" />
      <StatTile label="Gain du recuit" value={'-' + formatNumber(stats.gainPct, 1)} unit={`% (${formatNumber(stats.gainKm)} km)`} />
      <StatTile label="Remplissage moyen" value={stats.avgLoad} unit="%" />
    </section>
  )
}
