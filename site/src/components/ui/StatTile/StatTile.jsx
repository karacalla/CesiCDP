import { Card } from '../Card'
import styles from './StatTile.module.css'

// tuile avec un chiffre clé, ex : Distance totale 22 315 km
export function StatTile({ label, value, unit }) {
  return (
    <Card>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>
        {value}
        <span className={styles.unit}>{unit}</span>
      </p>
    </Card>
  )
}
