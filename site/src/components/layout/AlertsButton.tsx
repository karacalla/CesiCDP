/**
 * Rôle : cloche d'alertes : regroupe les points d'attention (FIFO, contraintes non prises en compte, retards,
 *   lignes écartées à l'import). Pastille rose = nombre d'alertes ; panneau refermable par Échap.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { fr } from '@/i18n/fr'
import { ignoredBy } from '@/lib/constraints'
import { fifoViolations } from '@/lib/traffic'
import { useRun } from '@/store/run'
import { useVrp } from '@/store/vrp'

export function AlertsButton() {
  const id = useId()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const instance = useVrp((s) => s.instance)
  const report = useVrp((s) => s.importReport)
  const algo = useRun((s) => s.algo)
  const result = useRun((s) => s.result)

  const alerts: string[] = []
  if (instance) {
    if (fifoViolations(instance.traffic.slots, 30).length) alerts.push(fr.header.fifo)
    const ignored = result?.ignoredConstraints ?? ignoredBy(algo, instance)
    if (ignored.length) alerts.push(fr.header.ignored(ignored.map((c) => fr.run.caps[c].toLowerCase()).join(', ')))
  }
  const late = result?.routes.reduce((s, r) => s + r.stops.filter((x) => (x.late ?? 0) > 0.5).length, 0) ?? 0
  if (late) alerts.push(fr.header.late(late))
  if (report?.issues.length) alerts.push(fr.header.importIssues(report.issues.length))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => void (e.key === 'Escape' && setOpen(false))
    const onDown = (e: MouseEvent): void => void (!ref.current?.contains(e.target as Node) && setOpen(false))
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={fr.header.alerts(alerts.length)}
        title={fr.header.alerts(alerts.length)}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-full border border-panel-line bg-panel-surface text-panel-ink hover:border-panel-ink-2"
      >
        <Bell size={18} aria-hidden />
        {alerts.length > 0 && (
          <span aria-hidden className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-xs font-bold leading-none text-on-accent">{alerts.length}</span>
        )}
      </button>
      {open && (
        <div id={id} role="region" aria-label={fr.header.alertsTitle} className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-panel-line bg-panel-surface p-3 shadow-[var(--shadow-float)]">
          <p className="mb-2 text-sm font-semibold text-panel-ink">{fr.header.alertsTitle}</p>
          {alerts.length === 0 ? (
            <p className="text-xs text-panel-ink-2">{fr.header.noAlerts}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {alerts.map((a) => (
                <li key={a} className="flex gap-2 text-xs text-panel-ink">
                  <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
