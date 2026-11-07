/**
 * Rôle : en-tête du panneau : recherche, notifications, thème, membres du groupe (E1).
 */
import { Bell, Moon, Search, Sun } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { fr } from '@/i18n/fr'
import { useUi } from '@/store/ui'
import { TeamHeader } from './TeamHeader'

export function PanelHeader() {
  const theme = useUi((s) => s.theme)
  const toggleTheme = useUi((s) => s.toggleTheme)
  const icon = { size: 18, 'aria-hidden': true } as const

  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{fr.panel.search}</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-panel-ink-2" />
          <input
            type="search"
            placeholder={fr.panel.searchPlaceholder}
            className="h-10 w-full rounded-full border border-panel-line bg-panel-surface pl-10 pr-4 text-sm text-panel-ink placeholder:text-panel-ink-2"
          />
        </label>
        <IconButton variant="panel" label={fr.panel.notifications} icon={<Bell {...icon} />} />
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
