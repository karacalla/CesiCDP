import { Leaf } from 'lucide-react'
import { CO2_PARIS_LYON_ROUND_TRIP } from '../../config'
import { PAL } from '../../data'
import { formatNumber } from '../../lib'
import styles from './CarbonCard.module.css'

/** CO₂ économisé par rapport à une tournée non optimisée. */
export function CarbonCard({ saved }) {
  const roundTrips = Math.max(1, Math.round(saved / CO2_PARIS_LYON_ROUND_TRIP))
  return (
    <section className={styles.root}>
      <div className={`sheen ${styles.sheen}`} style={{ backgroundImage: `linear-gradient(90deg, transparent, ${PAL.blue}, ${PAL.pink}, transparent)` }} />
      <div className={styles.row}>
        <div className={styles.icon}><Leaf size={22} /></div>
        <div>
          <p className={styles.value}>−{formatNumber(saved, 1)} <span className={styles.unit}>kg de CO₂</span></p>
          <p className={styles.text}>
            Par rapport à une tournée non optimisée, soit environ {roundTrips} aller-retour Paris–Lyon en voiture évité.
          </p>
        </div>
      </div>
    </section>
  )
}
