/**
 * Rôle : en-tête compact du panneau : recherche de client, alertes, thème ; membres du groupe (E1) sur une ligne.
 */
import { Moon, Sun } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { fr } from '@/i18n/fr'
import { useUi } from '@/store/ui'
import { AlertsButton } from './AlertsButton'
import { CustomerSearch } from './CustomerSearch'
import { SettingsButton } from './SettingsButton'
import { TeamHeader } from './TeamHeader'

export function PanelHeader() {
  const theme = useUi((s) => s.theme)
  const toggleTheme = useUi((s) => s.toggleTheme)
  const icon = { size: 18, 'aria-hidden': true } as const

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <CustomerSearch />
        <AlertsButton />
        <SettingsButton />
        <IconButton
          variant="panel"
          label={theme === 'light' ? fr.panel.themeToDark : fr.panel.themeToLight}
          aria-pressed={theme === 'dark'}
          icon={theme === 'light' ? <Moon {...icon} /> : <Sun {...icon} />}
          onClick={toggleTheme}
        />
      </div>
      <TeamHeader />
    </header>
  )
}
