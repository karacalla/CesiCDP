import { Bell, Search } from 'lucide-react'
import { Badge, Button, Input } from '../../components/ui'
import styles from './DashboardHeader.module.css'

const SEARCH_LABEL = 'Rechercher un client ou une tournée'

/** Recherche, notifications et avatar. */
export function DashboardHeader() {
  return (
    <header className={styles.root}>
      <Input className={styles.search} icon={Search} label={SEARCH_LABEL} placeholder={SEARCH_LABEL} />
      <Button variant="light" size="lg" aria-label="Notifications">
        <Bell size={16} />
        <Badge inset>5</Badge>
      </Button>
      <div className={styles.avatar}>DN</div>
    </header>
  )
}
