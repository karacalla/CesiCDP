import { ROUTES } from '../../data'
import { CarbonCard } from './CarbonCard'
import { DashboardHeader } from './DashboardHeader'
import { FleetSummary } from './FleetSummary'
import { JourneyList } from './JourneyList'
import { StatsRow } from './StatsRow'
import styles from './Dashboard.module.css'

// partie droite de la page
export function Dashboard({ route, stats, onSelectRoute, onShowAll }) {
  return (
    <aside className={`no-scrollbar ${styles.root}`}>
      <DashboardHeader stats={stats} />
      <FleetSummary route={route} stats={stats} />
      <StatsRow stats={stats} />
      <CarbonCard stats={stats} />
      <JourneyList routes={ROUTES} selected={route} onSelect={onSelectRoute} onShowAll={onShowAll} />
    </aside>
  )
}
