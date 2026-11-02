import { ROUTES } from '../../data'
import { CarbonCard } from './CarbonCard'
import { DashboardHeader } from './DashboardHeader'
import { FleetSummary } from './FleetSummary'
import { JourneyList } from './JourneyList'
import { StatsRow } from './StatsRow'
import styles from './Dashboard.module.css'

/** Panneau latéral : flotte active, chiffres clés, CO₂ et tournées. */
export function Dashboard({ route, stats, onSelectRoute }) {
  return (
    <aside className={`no-scrollbar ${styles.root}`}>
      <DashboardHeader />
      <FleetSummary route={route} />
      <StatsRow stats={stats} />
      <CarbonCard saved={stats.co2Saved} />
      <JourneyList routes={ROUTES} activeId={route.id} onSelect={onSelectRoute} />
    </aside>
  )
}
