/**
 * Rôle : vue « Contraintes » : fenêtres horaires (strictes, attente) et trafic par tranche (exigences E2, E3),
 *   avec contrôle de la propriété FIFO.
 */
import { useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Section } from '@/components/ui/Section'
import { Switch } from '@/components/ui/Switch'
import { fr } from '@/i18n/fr'
import { formatHm } from '@/lib/time'
import { fifoViolations } from '@/lib/traffic'
import { useVrp } from '@/store/vrp'
import { TrafficEditor } from './TrafficEditor'
import { TravelTimeChart } from './TravelTimeChart'

const num = (v: number): string => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })

export function ConstraintsView() {
  const instance = useVrp((s) => s.instance)
  const setOptions = useVrp((s) => s.setOptions)
  const [refMin, setRefMin] = useState(30)
  if (!instance) return null
  const { options, traffic } = instance
  const violations = fifoViolations(traffic.slots, refMin)

  return (
    <div className="flex flex-col gap-4">
      <Section title={fr.constraints.windows}>
        <Switch label={fr.constraints.strict} description={fr.constraints.strictHint} checked={options.timeWindows === 'strict'} onChange={(v) => setOptions({ timeWindows: v ? 'strict' : 'off' })} />
        {/* le solveur attend TOUJOURS l'ouverture de la fenêtre : l'interrupteur est affiché, coché et bloqué (prochaine version) */}
        <Switch label={fr.constraints.wait} description={fr.constraints.waitNext} checked disabled onChange={() => undefined} />
      </Section>

      <Section title={fr.constraints.traffic}>
        <p className="text-xs text-panel-ink-2">{fr.constraints.trafficHint}</p>
        {/* clé = tranches enregistrées : l'éditeur repart des valeurs du store après chaque validation */}
        <TrafficEditor key={JSON.stringify(traffic.slots)} slots={traffic.slots} />
        <label className="flex items-center gap-2 text-xs text-panel-ink-2">
          {fr.constraints.refLabel}
          <input type="number" min={1} max={240} value={refMin} onChange={(e) => setRefMin(Math.min(240, Math.max(1, Number(e.target.value) || 1)))} className="h-8 w-20 rounded-lg border border-panel-line bg-panel-surface px-2 tabular-nums text-panel-ink" />
        </label>
        <TravelTimeChart slots={traffic.slots} refMin={refMin} violations={violations} />
        <div aria-live="polite">
          {violations.length > 0 ? (
            <div role="alert" className="flex gap-3 rounded-2xl border border-panel-late p-3">
              <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0 text-panel-late" />
              <div className="flex flex-col gap-1 text-xs text-panel-ink">
                <p className="text-sm font-semibold">{fr.constraints.fifoTitle}</p>
                {violations.map((v) => (
                  <p key={v.at}>{fr.constraints.fifoItem(formatHm(v.at), num(v.before), num(v.after), formatHm(v.arrivalIfJustBefore), formatHm(v.arrivalIfAt))}</p>
                ))}
                <p className="text-panel-ink-2">{fr.constraints.fifoAdvice}</p>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs text-panel-ink"><CheckCircle2 size={16} aria-hidden className="text-panel-ok" />{fr.constraints.fifoOk}</p>
          )}
        </div>
      </Section>
    </div>
  )
}
