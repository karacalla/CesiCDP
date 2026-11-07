/**
 * Rôle : carte d'information flottante (camion ou arrêt sélectionné), forme « organique » de l'identité :
 *   blanche, rayon 28 px, coin inférieur droit creusé en concave où s'accroche le bouton ✕ sombre.
 * Lecture : titre gras sur deux lignes → statut (point ambre + libellé) → deux pastilles étiquetées → distance,
 *   durée et petit profil d'altitude. Région nommée et annoncée (aria-live) quand la sélection change.
 * Technique : `mask` radial pour le coin concave (pas de canvas, pas de filtre coûteux).
 */
import { AlertTriangle, CheckCircle2, Clock3, X } from 'lucide-react'
import { fr } from '@/i18n/fr'
import { formatDuration, formatHm } from '@/lib/time'
import { useSelection } from '@/store/selection'
import { stopStatus, useTours } from './useTours'
import { useElevationProfile } from './useElevationProfile'

const km = (m: number): string => (m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })

function Profile({ values, at }: { values: number[]; at: number }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 96, 26 - ((v - min) / (max - min || 1)) * 22] as const)
  const k = Math.max(0, Math.min(1, at)) * (values.length - 1)
  const dot = pts[Math.round(k)] ?? pts[0]
  return (
    <svg viewBox="0 0 96 28" className="h-7 w-24 overflow-visible" role="img" aria-label={`${fr.tours.profile} : de ${Math.round(min)} à ${Math.round(max)} m`}>
      <path d={`M0 28 ${pts.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')} L96 28 Z`} className="fill-accent/20" />
      <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')} fill="none" className="stroke-accent-ink" strokeWidth={1.75} strokeLinejoin="round" />
      {dot && <circle cx={dot[0]} cy={dot[1]} r={3} className="fill-accent stroke-white" strokeWidth={1.5} />}
    </svg>
  )
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-ink-2">{label}</span>
      {/* la carte d'info est toujours blanche (posée sur la carte sombre) : couleurs brutes, indépendantes du thème */}
      <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-sm font-semibold tabular-nums text-ink">{value}</span>
    </div>
  )
}

export function InfoCard() {
  const { instance, selected, customers, state, geo } = useTours()
  const stopId = useSelection((s) => s.stopId)
  const selectStop = useSelection((s) => s.selectStop)
  const selectVehicle = useSelection((s) => s.selectVehicle)
  const clock = useSelection((s) => s.clock)
  const profile = useElevationProfile(selected?.track ?? null)
  if (!geo || !instance || !selected) return null

  const { route, track } = selected
  const stopIdx = route.stops.findIndex((s) => s.customerId === stopId)
  const stop = stopIdx >= 0 ? route.stops[stopIdx] : undefined
  const customer = stop ? customers.get(stop.customerId) : undefined
  const total = track?.cum.at(-1) ?? route.distanceM ?? 0
  const next = route.stops[state?.nextStop ?? 0]
  const nextName = next ? customers.get(next.customerId)?.name : fr.tours.depot
  const done = Math.min(state?.nextStop ?? 0, route.stops.length)

  let title: [string, string]
  let status: { icon: typeof CheckCircle2; text: string; cls: string }
  let pills: [[string, string], [string, string]]
  let footer: string
  if (stop && customer) {
    const st = stopStatus(stop)
    title = [customer.name.split(' — ')[0] ?? customer.name, customer.name.split(' — ')[1] ?? fr.tours.truck(route.vehicleId)]
    status =
      st === 'late' ? { icon: AlertTriangle, text: fr.tours.status.late(Math.round(stop.late ?? 0)), cls: 'text-late-ink' }
      : st === 'wait' ? { icon: Clock3, text: fr.tours.status.wait(Math.round(stop.wait ?? 0)), cls: 'text-wait-ink' }
      : { icon: CheckCircle2, text: st === 'none' ? fr.tours.status.none : fr.tours.status.ok, cls: 'text-ok-ink' }
    pills = [[fr.tours.demand, String(customer.demand)], [fr.tours.window, customer.tw ? `${formatHm(customer.tw.a)}–${formatHm(customer.tw.b)}` : '—']]
    footer = stop.arrival === null ? fr.tours.noSchedule : `${fr.tours.arrival} ${formatHm(stop.arrival)} · arrêt ${stopIdx + 1}/${route.stops.length}`
  } else {
    title = [fr.tours.truck(route.vehicleId), `vers ${nextName ?? fr.tours.depot}`]
    status = { icon: CheckCircle2, text: `${fr.tours.phase[state?.phase ?? 'before']} · ${formatHm(clock)}`, cls: 'text-ink' }
    pills = [[fr.tours.load, `${route.load} / ${instance.fleet.Q}`], [fr.tours.nStops, `${done} / ${route.stops.length}`]]
    footer = `${km(total)} km · ${route.start !== null && route.end !== null ? formatDuration(route.end - route.start) : '—'}`
  }
  const StatusIcon = status.icon

  return (
    <section aria-label={`${title[0]}, ${title[1]}`} aria-live="polite" className="pointer-events-auto absolute bottom-20 left-6 z-10 hidden w-[320px] max-w-[calc(100%-3rem)] lg:block">
      <div className="rounded-[28px] bg-card p-5 text-ink shadow-[var(--shadow-float)] [mask:radial-gradient(circle_30px_at_100%_100%,transparent_29px,#000_30px)]">
        <h2 className="text-lg font-bold leading-tight">
          <span className="block truncate">{title[0]}</span>
          <span className="block truncate">{title[1]}</span>
        </h2>
        <p className={`mt-2 flex items-center gap-2 text-sm ${status.cls}`}>
          {stop ? <StatusIcon size={16} aria-hidden /> : <span aria-hidden className="size-2 rounded-full bg-accent" />}
          {status.text}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Pill label={pills[0][0]} value={pills[0][1]} />
          <Pill label={pills[1][0]} value={pills[1][1]} />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3 pr-6">
          <p className="text-sm font-semibold tabular-nums">{footer}</p>
          {!stop && profile && <Profile values={profile} at={total ? (state?.distance ?? 0) / total : 0} />}
        </div>
      </div>
      <button
        type="button"
        onClick={() => (stop ? selectStop(null) : selectVehicle(null))}
        aria-label={fr.tours.close}
        title={fr.tours.close}
        className="absolute bottom-0 right-0 grid size-10 translate-x-1/4 translate-y-1/4 place-items-center rounded-full bg-ink text-on-dark shadow-lg hover:bg-bg-dark"
      >
        <X size={18} aria-hidden />
      </button>
    </section>
  )
}
