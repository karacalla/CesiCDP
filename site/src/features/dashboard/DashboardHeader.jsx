import { Info } from 'lucide-react'
import { formatNumber } from '../../lib'
import styles from './DashboardHeader.module.css'

// encadré qui explique d'où viennent les données
export function DashboardHeader({ stats }) {
  return (
    <header className={styles.root}>
      <Info size={16} className={styles.icon} />
      <p>
        Ce site ne calcule rien : il affiche le résultat de notre recuit simulé, calculé à l'avance
        par <code className={styles.code}>algorithme/gen_carte.py</code> (en {formatNumber(stats.dureeCalcul)} s)
        et enregistré dans <code className={styles.code}>tournees.json</code>.
      </p>
    </header>
  )
}
