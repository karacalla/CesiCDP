import { motion } from 'framer-motion'
import { Truck } from 'lucide-react'
import { cx, formatNumber } from '../../lib'
import styles from './Journey.module.css'

/** Carte d'une tournée : horaires, durée, trajet et remplissage. */
export function Journey({ route, active, onClick }) {
  const { color } = route
  return (
    <motion.button
      layout
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cx(styles.root, active && styles.active)}
      style={{ '--tw-ring-color': color }}
    >
      <div className={styles.times}>
        <span className={styles.date}>{route.date}</span>
        <span className={styles.time}>{route.start}</span>
        <span className={styles.duration}>{route.duration} min</span>
        <span className={styles.time}>{route.end}</span>
      </div>
      <div className={styles.track}>
        <span className={styles.line} style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
        <span className={styles.dot} style={{ background: color }} />
        <span className={styles.truck} style={{ background: color }}><Truck size={14} className={styles.truckIcon} /></span>
        <span className={styles.dot} style={{ background: color }} />
      </div>
      <div className={styles.places}>
        <span className={styles.place}>{route.from}</span>
        <span className={styles.chip}>{formatNumber(route.km)} km · {route.load} % rempli</span>
        <span className={styles.place}>{route.to}</span>
      </div>
    </motion.button>
  )
}
