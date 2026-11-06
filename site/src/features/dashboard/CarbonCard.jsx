import { Leaf } from 'lucide-react'
import { CO2_PER_KM } from '../../config'
import { PAL } from '../../data'
import { formatNumber } from '../../lib'
import styles from './CarbonCard.module.css'

// estimation du CO2 des tournées et du CO2 évité grâce au recuit
export function CarbonCard({ stats }) {
  const degrade = `linear-gradient(90deg, transparent, ${PAL.blue}, ${PAL.pink}, transparent)`
  const tonnes = stats.co2Total / 1000

  return (
    <section className={styles.root}>
      {/* petite barre colorée animée en haut */}
      <div className={`sheen ${styles.sheen}`} style={{ backgroundImage: degrade }} />
      <div className={styles.row}>
        <div className={styles.icon}><Leaf size={22} /></div>
        <div>
          <p className={styles.value}>≈ {formatNumber(tonnes, 1)} <span className={styles.unit}>t de CO₂</span></p>
          <p className={styles.text}>
            Estimation pour l'ensemble des tournées ({formatNumber(CO2_PER_KM, 2)} kg de CO₂ par km).
            Le recuit évite environ {formatNumber(stats.co2Saved)} kg par rapport à la solution de départ.
          </p>
        </div>
      </div>
    </section>
  )
}
