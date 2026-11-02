import { MoreHorizontal } from 'lucide-react'
import { Button } from '../../components/ui'
import { TruckTopDown } from './TruckTopDown'
import styles from './FleetSummary.module.css'

/** Titre de la flotte, camion actif et illustration. */
export function FleetSummary({ route }) {
  return (
    <section>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Flotte électrique</h1>
          <span className={styles.pill} style={{ background: route.color, boxShadow: `0 4px 14px -2px ${route.color}88` }}>
            {route.name.split(' · ')[0]} · {route.load} % rempli
          </span>
        </div>
        <Button variant="light" size="sm" aria-label="Options"><MoreHorizontal size={16} /></Button>
      </div>
      <div className={styles.truck}><TruckTopDown /></div>
    </section>
  )
}
