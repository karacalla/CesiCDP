import { Card } from '../Card'
import styles from './StatTile.module.css'

/** Tuile de statistique : libellé, valeur et unité. */
export function StatTile({ label, value, unit }) {
  return (
    <Card padded>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>
        {value}
        <span className={styles.unit}>{unit}</span>
      </p>
    </Card>
  )
}
