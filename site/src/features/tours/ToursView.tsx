/**
 * Rôle : vue d'accueil « Tournées » : l'action principale (calculer) puis, dès le résultat, le camion sélectionné
 *   en vitrine, les indicateurs, toutes les tournées, l'heure affichée et la liste des arrêts (équivalent texte de
 *   la carte). Parcours : ouvrir → « Calculer les tournées » → tournées affichées, sans autre clic.
 */
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, MapPin, Share2 } from 'lucide-react'
import { ShareDialog } from '@/features/share/ShareDialog'
import { CO2_KG_PER_KM } from '@/config/app'
import { fr } from '@/i18n/fr'
import { formatDuration, formatHm } from '@/lib/time'
import { useSelection } from '@/store/selection'
import { Gantt } from './gantt/Gantt'
import { JourneyCard } from './JourneyCard'
import { RunHero } from './RunHero'
import { PanelTruck } from '@/features/cameo/PanelTruck'
import { stopStatus, useTours } from './useTours'

const num = (v: number, d = 0): string => v.toLocaleString('fr-FR', { maximumFractionDigits: d })

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl bg-panel-surface p-3">
      <span className="text-xs text-panel-ink-2">{label}</span>
      <span className="text-xl font-extrabold tabular-nums text-panel-ink">{value}</span>
      {sub && <span className="text-xs text-panel-ink-2">{sub}</span>}
    </div>
  )
}

function ShareButton({ vehicleId, onClick }: { vehicleId: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={fr.share.buttonFor(vehicleId)} className="inline-flex h-9 items-center gap-2 rounded-full border border-panel-line bg-panel-surface px-4 text-sm font-semibold text-panel-ink hover:border-panel-ink-2">
      <Share2 size={16} aria-hidden /> {fr.share.button}
    </button>
  )
}

export function ToursView() {
  const { instance, result, tours, selected, customers, kpis, stale } = useTours()
  const vehicleId = useSelection((s) => s.vehicleId)
  const stopId = useSelection((s) => s.stopId)
  const clock = useSelection((s) => s.clock)
  const { selectVehicle, selectStop, setClock } = useSelection()
  const [shareOpen, setShareOpen] = useState(false)
  if (!instance) return null

  if (!result || !kpis) return <RunHero instance={instance} compact={false} />

  const sel = selected ?? tours[0]
  const indicative = result.ignoredConstraints.includes('timeWindows')

  return (
    <div className="flex flex-col gap-5">
      {stale && (
        <p role="status" className="flex gap-2 rounded-2xl border border-panel-late p-3 text-xs text-panel-ink">
          <AlertTriangle size={16} aria-hidden className="shrink-0 text-panel-late" /> {fr.tours.stale}
        </p>
      )}

      {sel && (
        <div className="relative mx-auto w-full max-w-[460px]">
          <PanelTruck vehicleId={sel.route.vehicleId} returnAt={sel.route.end} className="z-10 -mb-12 ml-[2%] w-[96%]" />
          <JourneyCard route={sel.route} Q={instance.fleet.Q} selected onSelect={() => selectVehicle(sel.route.vehicleId)} className="pt-14" />
          <div className="mt-3 flex justify-end">
            <ShareButton vehicleId={sel.route.vehicleId} onClick={() => setShareOpen(true)} />
          </div>
          <ShareDialog vehicleId={sel.route.vehicleId} open={shareOpen} onOpenChange={setShareOpen} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Kpi label={fr.tours.kpi.distance} value={`${num(kpis.distanceM / 1000)} km`} />
        <Kpi label={fr.tours.kpi.drive} value={formatDuration(kpis.driveMin)} />
        <Kpi label={fr.tours.kpi.trucks} value={`${kpis.used} / ${kpis.k}`} />
        <Kpi label={fr.tours.kpi.fill} value={`${num(100 * kpis.fill)} %`} />
        <Kpi label={fr.tours.kpi.co2} value={`${num(kpis.co2)} kg`} sub={kpis.co2Ref !== null ? fr.tours.co2Saved(num(kpis.co2Ref - kpis.co2)) : undefined} />
        <Kpi label={fr.tours.kpi.late} value={String(kpis.late)} sub={indicative ? fr.tours.kpi.lateIndicative : undefined} />
      </div>
      <p className="-mt-2 text-xs text-panel-ink-2">
        {fr.run.objective} : {result.objective}. {result.comparison ? `${fr.tours.comparison} : ${result.comparison.label}. ` : ''}
        {fr.tours.co2Source(num(CO2_KG_PER_KM, 2))}.
      </p>

      <label className="flex flex-col gap-2 text-xs font-medium text-panel-ink-2">
        <span className="flex justify-between">
          {fr.tours.clock}
          <span className="font-semibold tabular-nums text-panel-ink">{formatHm(clock)}</span>
        </span>
        <input type="range" min={7 * 60} max={19 * 60} step={5} value={clock} aria-valuetext={formatHm(clock)} onChange={(e) => setClock(Number(e.target.value))} className="accent-[var(--accent)]" />
      </label>

      <section aria-labelledby="tours-list" className="flex flex-col gap-2">
        <h2 id="tours-list" className="text-base font-semibold text-panel-ink">{fr.tours.list}</h2>
        {tours.map((t) => (
          <JourneyCard
            key={t.route.vehicleId}
            route={t.route}
            Q={instance.fleet.Q}
            selected={t.route.vehicleId === vehicleId}
            onSelect={() => selectVehicle(t.route.vehicleId)}
          />
        ))}
      </section>

      <section aria-labelledby="gantt-title" className="flex flex-col gap-2">
        <h2 id="gantt-title" className="text-base font-semibold text-panel-ink">{fr.tours.gantt.title}</h2>
        <Gantt routes={result.routes} customers={customers} />
      </section>

      {sel && (
        <section aria-labelledby="stops-list" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 id="stops-list" className="text-base font-semibold text-panel-ink">{fr.tours.stopsTitle(sel.route.vehicleId)}</h2>
            <ShareButton vehicleId={sel.route.vehicleId} onClick={() => setShareOpen(true)} />
          </div>
          {indicative && <p className="text-xs text-panel-ink-2">{fr.tours.indicative}</p>}
          <ol className="flex flex-col gap-1">
            {sel.route.stops.map((s, i) => {
              const c = customers.get(s.customerId)
              const st = stopStatus(s)
              const Icon = st === 'late' ? AlertTriangle : st === 'wait' ? Clock3 : st === 'ok' ? CheckCircle2 : MapPin
              const cls = st === 'late' ? 'text-panel-late' : st === 'wait' ? 'text-panel-wait' : st === 'ok' ? 'text-panel-ok' : 'text-panel-ink-2'
              const label = st === 'late' ? fr.tours.status.late(Math.round(s.late ?? 0)) : st === 'wait' ? fr.tours.status.wait(Math.round(s.wait ?? 0)) : st === 'ok' ? fr.tours.status.ok : fr.tours.status.none
              return (
                <li key={s.customerId}>
                  <button
                    type="button"
                    onClick={() => selectStop(s.customerId, sel.route.vehicleId)}
                    aria-pressed={stopId === s.customerId}
                    className={`grid w-full grid-cols-[1.75rem_1fr_auto] items-center gap-2 rounded-xl px-2 py-2 text-left text-sm ${stopId === s.customerId ? 'bg-panel-surface ring-1 ring-panel-ink' : 'hover:bg-panel-surface'}`}
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-panel-surface text-xs font-bold tabular-nums text-panel-ink ring-1 ring-panel-line">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-panel-ink">{c?.name ?? `Client ${s.customerId}`}</span>
                      <span className="block text-xs text-panel-ink-2 tabular-nums">
                        {s.arrival === null ? '—' : formatHm(s.arrival)} · {c?.tw ? `${formatHm(c.tw.a)}–${formatHm(c.tw.b)}` : 'sans fenêtre'}
                      </span>
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cls}`}>
                      <Icon size={14} aria-hidden /> {label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <RunHero instance={instance} compact />
    </div>
  )
}
