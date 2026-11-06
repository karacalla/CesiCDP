import { Warehouse } from 'lucide-react'
import { PAL } from '../../data'
import styles from './Pin.module.css'

// repère du dépôt avec un anneau qui pulse
export function Pin({ label }) {
  return (
    <div className={styles.root} title={label} style={{ '--c': PAL.pink }}>
      <span className={`pulse-ring ${styles.ring}`} />
      <Warehouse size={16} />
    </div>
  )
}
