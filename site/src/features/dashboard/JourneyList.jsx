import { Button } from '../../components/ui'
import { Journey } from './Journey'
import styles from './JourneyList.module.css'

// liste de toutes les tournées + bouton pour tout réafficher
export function JourneyList({ routes, selected, onSelect, onShowAll }) {
  return (
    <section className={styles.root}>
      <div className={styles.head}>
        <h3 className={styles.title}>Tournées <span className={styles.count}>{routes.length}</span></h3>
        <Button variant="light" onClick={onShowAll}>Tout voir</Button>
      </div>
      {/* une carte par tournée, au clic on la sélectionne */}
      {routes.map((r) => (
        <Journey key={r.id} route={r} active={selected && selected.id === r.id} onClick={() => onSelect(r)} />
      ))}
    </section>
  )
}
