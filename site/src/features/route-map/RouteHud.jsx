import { Package, X } from 'lucide-react'
import { DEPOT, INFOS } from '../../data'
import { formatNumber } from '../../lib'
import styles from './RouteHud.module.css'

// fiche de la tournée sélectionnée, en bas à gauche de la carte
export function RouteHud({ route, onClose }) {
  // ordre de passage : dépôt -> numéros des clients -> dépôt
  const numeros = route.clients.map((c) => c.id)
  const ordre = [DEPOT.nom, ...numeros, DEPOT.nom].join(' → ')

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <p className={styles.route}>Tournée sélectionnée</p>
          <h3 className={styles.name}>{route.name}</h3>
        </div>
        <button title="Fermer" onClick={onClose} className={styles.close}><X size={13} /></button>
      </div>

      <div className={styles.fields}>
        <div>
          <p className={styles.label}>Charge</p>
          <div className={styles.parcels} style={{ background: route.color }}>
            <Package size={13} />{route.charge} / {INFOS.capacite}
          </div>
        </div>
        <div>
          <p className={styles.label}>Distance</p>
          <div className={styles.box}>{formatNumber(route.km, 1)} km</div>
        </div>
        <div>
          <p className={styles.label}>Clients</p>
          <div className={styles.box}>{route.clients.length}</div>
        </div>
      </div>

      <p className={styles.label}>Ordre de passage</p>
      <p className={`no-scrollbar ${styles.order}`}>{ordre}</p>
    </div>
  )
}
