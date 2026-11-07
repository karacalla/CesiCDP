/**
 * Rôle : éléments « verre » sur la carte pour le camion sélectionné (≤ 40, ADR-004) :
 *   - pins d'arrêt : cercle de verre sombre 36 px, icône blanche, petit badge ambre (ordre de passage) ;
 *     l'arrêt actif est un cercle blanc plein ;
 *   - dépôt ;
 *   - curseur de navigation : flèche ambre dans un halo de verre, cône de visée orienté selon le trajet.
 * Les pins sont de vrais boutons (clavier, nom accessible complet) ; la liste des arrêts du panneau dit la même chose.
 */
import { useMemo } from 'react'
import { Navigation2, Package, Warehouse } from 'lucide-react'
import { fr } from '@/i18n/fr'
import { formatHm } from '@/lib/time'
import { useSelection } from '@/store/selection'
import { stopStatus, useTours } from './useTours'
import { useProjected, type Projected } from './useProjected'

const MAX_PINS = 40

function statusText(s: ReturnType<typeof stopStatus>, wait: number, late: number): string {
  if (s === 'late') return fr.tours.status.late(Math.round(late))
  if (s === 'wait') return fr.tours.status.wait(Math.round(wait))
  return s === 'none' ? fr.tours.status.none : fr.tours.status.ok
}

export function MapMarkers() {
  const { instance, selected, customers, state, geo } = useTours()
  const stopId = useSelection((s) => s.stopId)
  const selectStop = useSelection((s) => s.selectStop)

  const stops = useMemo(() => (selected?.route.stops ?? []).slice(0, MAX_PINS), [selected])
  const items = useMemo<Projected[]>(() => {
    const list: Projected[] = stops.flatMap((s) => {
      const c = customers.get(s.customerId)
      return c ? [{ lngLat: [c.lng, c.lat] as [number, number] }] : []
    })
    if (instance && selected) list.push({ lngLat: [instance.depot.lng, instance.depot.lat] })
    if (state && state.phase !== 'returned' && state.phase !== 'before') list.push({ lngLat: state.point, heading: state.heading })
    return list
  }, [stops, customers, instance, selected, state])
  const ref = useProjected(items)

  if (!geo || !selected || !instance) return null
  const cursorIndex = items.length - 1
  const hasCursor = items[cursorIndex]?.heading !== undefined

  return (
    <div className="pointer-events-none absolute inset-0 isolate overflow-hidden">
      {stops.map((s, i) => {
        const c = customers.get(s.customerId)
        if (!c) return null
        const active = stopId === s.customerId
        const st = stopStatus(s)
        return (
          <div key={s.customerId} ref={ref(i)} className="absolute left-0 top-0 size-0" style={{ zIndex: active ? 3 : 2 }}>
            <button
              type="button"
              onClick={() => selectStop(active ? null : s.customerId)}
              aria-pressed={active}
              aria-label={fr.tours.pinLabel(i + 1, c.name, s.arrival === null ? '—' : formatHm(s.arrival), statusText(st, s.wait ?? 0, s.late ?? 0))}
              className={`pointer-events-auto absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-[0_8px_24px_-8px_rgb(2_6_23/0.8)] transition-colors ${
                active ? 'bg-white text-ink' : 'glass text-on-dark hover:bg-black/60'
              }`}
            >
              <Package size={16} aria-hidden />
              <span aria-hidden className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-xs font-bold leading-none text-on-accent">
                {i + 1}
              </span>
            </button>
          </div>
        )
      })}
      <div ref={ref(stops.length)} className="absolute left-0 top-0 size-0" style={{ zIndex: 1 }}>
        <span role="img" aria-label={`${fr.tours.depot} : ${instance.depot.name}`} className="glass absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-on-dark">
          <Warehouse size={16} aria-hidden />
        </span>
      </div>
      {hasCursor && (
        <div ref={ref(cursorIndex)} className="absolute left-0 top-0 size-0" style={{ zIndex: 4 }}>
          {/* cône de visée : dégradé conique ambre, estompé vers l'extérieur */}
          <span aria-hidden className="absolute size-28 -translate-x-1/2 -translate-y-1/2 rounded-full [background:conic-gradient(from_-28deg,rgb(245_158_11/0.55),rgb(245_158_11/0)_56deg,transparent_56deg)] [mask:radial-gradient(circle,#000_30%,transparent_70%)]" />
          <span role="img" aria-label={`${fr.tours.truck(selected.route.vehicleId)} : ${fr.tours.phase[state?.phase ?? 'driving']}`} className="glass absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ring-1 ring-white/25">
            <Navigation2 size={20} aria-hidden className="fill-accent text-accent" />
          </span>
        </div>
      )}
    </div>
  )
}
