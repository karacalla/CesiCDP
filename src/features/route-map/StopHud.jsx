import { AnimatePresence, motion } from 'framer-motion'
import { Package, X } from 'lucide-react'
import { statusColor } from '../../lib'
import { Elevation } from './Elevation'
import styles from './StopHud.module.css'

const ENTER = { initial: { opacity: 0, y: 16, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 10 } }
const SPRING = { type: 'spring', stiffness: 240, damping: 24 }

/** Fiche flottante de l'arrêt sélectionné. */
export function StopHud({ open, stop, route, onClose }) {
  const status = statusColor(stop.status)
  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div key={stop.id} {...ENTER} transition={SPRING} className={styles.root}>
          <div className={styles.head}>
            <div>
              <p className={styles.route}>{route.name}</p>
              <h3 className={styles.name}>{stop.name}</h3>
            </div>
            <div className={styles.headRight}>
              <span className={styles.status} style={{ background: `${status}22` }}>
                <span className={styles.dot} style={{ background: status }} />{stop.status}
              </span>
              <button aria-label="Fermer" onClick={onClose} className={styles.close}><X size={13} /></button>
            </div>
          </div>

          <div className={styles.body}>
            <div className={styles.fields}>
              <div>
                <p className={styles.label}>Colis</p>
                <div className={styles.parcels} style={{ background: route.color }}><Package size={13} />{stop.parcels}</div>
              </div>
              <div>
                <p className={styles.label}>Fenêtre</p>
                <div className={styles.window}>{stop.win}</div>
              </div>
            </div>
            <div className={styles.eta}>
              <span className={styles.etaTime}>{stop.eta}<span className={styles.etaDist}> · {stop.dist}</span></span>
              <Elevation route={route} t={stop.t} color={route.inkColor} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
