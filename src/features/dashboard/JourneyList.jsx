import { Button } from '../../components/ui'
import { Journey } from './Journey'
import styles from './JourneyList.module.css'

/** Liste des dernières tournées ; `onSelect(route)` au clic. */
export function JourneyList({ routes, activeId, onSelect }) {
  return (
    <section className={styles.root}>
      <div className={styles.head}>
        <h3 className={styles.title}>Dernières tournées <span className={styles.count}>{routes.length}</span></h3>
        <Button variant="light" size="text">Tout voir</Button>
      </div>
      {routes.map((r) => (
        <Journey key={r.id} route={r} active={r.id === activeId} onClick={() => onSelect(r)} />
      ))}
    </section>
  )
}
