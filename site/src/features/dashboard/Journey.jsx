import { Truck } from 'lucide-react'
import { formatNumber } from '../../lib'
import styles from './Journey.module.css'

// carte d'une tournée dans la liste : km, clients, remplissage
export function Journey({ route, active, onClick }) {
  const color = route.color
  // on ajoute la classe active si la tournée est sélectionnée
  let className = styles.root
  if (active) className += ' ' + styles.active

  return (
    <button type="button" onClick={onClick} className={className} style={{ '--tw-ring-color': color }}>
      <div className={styles.top}>
        <span className={styles.name}>{route.name}</span>
        <span className={styles.km}>{formatNumber(route.km, 1)} km</span>
      </div>

      {/* petit trajet décoratif : dépôt - camion - dépôt */}
      <div className={styles.track}>
        <span className={styles.line} style={{ background: color }} />
        <span className={styles.dot} style={{ background: color }} />
        <span className={styles.truck} style={{ background: color }}><Truck size={14} className={styles.truckIcon} /></span>
        <span className={styles.dot} style={{ background: color }} />
      </div>

      <div className={styles.places}>
        <span className={styles.place}>{route.clients.length} clients</span>
        <span className={styles.chip}>charge {route.charge} · {route.load} % rempli</span>
      </div>

      {/* barre de remplissage du camion */}
      <div className={styles.bar}>
        <span className={styles.fill} style={{ width: route.load + '%', background: color }} />
      </div>
    </button>
  )
}
