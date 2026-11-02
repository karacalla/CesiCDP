import { Package } from 'lucide-react'
import { Badge } from '../../components/ui'
import { cx } from '../../lib'
import styles from './Pin.module.css'

/** Repère d'arrêt sur la carte, avec le nombre de colis. */
export function Pin({ stop, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={`${stop.name}, ${stop.parcels} colis`}
      style={{ '--c': color }}
      className={cx(styles.root, active ? styles.active : styles.idle)}
    >
      {active && <span className={cx('pulse-ring', styles.ring)} />}
      <Package size={16} />
      <Badge size="md" color={color}>{stop.parcels}</Badge>
    </button>
  )
}
