/**
 * Rôle : recherche d'un client (combobox ARIA) : ↑ ↓ pour parcourir, Entrée pour choisir, Échap pour fermer.
 *   Choisir un client le sélectionne (avec son camion s'il est planifié) et centre la carte dessus.
 */
import { useId, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useMap } from 'react-map-gl/maplibre'
import { CAMERA_MS, DRONE_PITCH } from '@/config/app'
import { MAP_ID } from '@/features/map/mapId'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { fr } from '@/i18n/fr'
import { useRun } from '@/store/run'
import { useSelection } from '@/store/selection'
import { useVrp } from '@/store/vrp'
import { visiblePadding } from '@/lib/cameraPadding'

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function CustomerSearch() {
  const id = useId()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // sélecteur stable : renvoyer `?? []` créerait un nouveau tableau à chaque lecture (boucle infinie Zustand)
  const instance = useVrp((s) => s.instance)
  const customers = useMemo(() => instance?.customers ?? [], [instance])
  const geo = instance?.meta.coordinates === 'geo'
  const result = useRun((s) => s.result)
  const selectStop = useSelection((s) => s.selectStop)
  const map = useMap()[MAP_ID]
  const reduced = usePrefersReducedMotion()

  const matches = useMemo(() => {
    const n = norm(q.trim())
    return n ? customers.filter((c) => norm(c.name).includes(n) || String(c.id) === n).slice(0, 6) : []
  }, [q, customers])

  const choose = (i: number): void => {
    const c = matches[i]
    if (!c) return
    const owner = result?.routes.find((r) => r.stops.some((s) => s.customerId === c.id))?.vehicleId ?? null
    selectStop(c.id, owner)
    if (geo && map) map.flyTo({ center: [c.lng, c.lat], zoom: 13, pitch: DRONE_PITCH, padding: visiblePadding(map.getContainer()), duration: reduced ? 0 : CAMERA_MS })
    setQ(c.name)
    setOpen(false)
  }

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={`${id}-in`} className="sr-only">{fr.panel.search}</label>
      <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-panel-ink-2" />
      <input
        id={`${id}-in`}
        role="combobox"
        aria-expanded={open && q.trim() !== ''}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${id}-o${active}` : undefined}
        type="search"
        autoComplete="off"
        placeholder={fr.panel.searchPlaceholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, Math.max(0, matches.length - 1)))
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
          else if (e.key === 'Enter') choose(active)
          else if (e.key === 'Escape') setOpen(false)
          else return
          e.preventDefault()
        }}
        className="h-10 w-full rounded-full border border-panel-line bg-panel-surface pl-10 pr-4 text-sm text-panel-ink placeholder:text-panel-ink-2"
      />
      {open && q.trim() !== '' && (
        <div id={`${id}-list`} role="listbox" aria-label={fr.panel.search} className="absolute inset-x-0 top-12 z-30 flex flex-col overflow-hidden rounded-2xl border border-panel-line bg-panel-surface py-1 shadow-[var(--shadow-float)]">
          {matches.length === 0 && <p className="px-4 py-2 text-sm text-panel-ink-2">{fr.header.searchEmpty}</p>}
          {matches.map((c, i) => (
            <div
              key={c.id}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(i)
              }}
              className={`cursor-pointer px-4 py-2 text-sm text-panel-ink ${i === active ? 'bg-panel' : ''}`}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
