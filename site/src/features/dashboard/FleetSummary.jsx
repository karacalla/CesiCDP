import { INFOS, PAL } from '../../data'
import styles from './FleetSummary.module.css'

// titre + pastille : résumé de la tournée sélectionnée ou de toute la flotte
export function FleetSummary({ route, stats }) {
  let color = PAL.blue
  let texte = `${stats.routeCount} camions · capacité ${INFOS.capacite} par camion`
  // si une tournée est sélectionnée on affiche ses infos à elle
  if (route) {
    color = route.color
    texte = `${route.name} · ${route.load} % rempli`
  }

  return (
    <section>
      <h1 className={styles.title}>Résultat du recuit simulé</h1>
      <span className={styles.pill} style={{ background: color, boxShadow: `0 4px 14px -2px ${color}` }}>
        {texte}
      </span>
    </section>
  )
}
