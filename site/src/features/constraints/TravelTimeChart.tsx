/**
 * Rôle : courbe en escalier du temps de parcours d'un trajet de référence selon l'heure de départ ; réagit à
 *   chaque modification des tranches. Les baisses de coefficient (violations FIFO) sont marquées sur l'axe.
 * Lecture : une seule série (le titre la nomme, pas de légende) ; info-bulle au survol ; tableau équivalent.
 */
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import { fr } from '@/i18n/fr'
import { formatHm } from '@/lib/time'
import { travelTimeSteps, type FifoViolation } from '@/lib/traffic'
import type { TrafficSlot } from '@/types/vrp'

const TICKS = [0, 4, 8, 12, 16, 20, 24]

export function TravelTimeChart({ slots, refMin, violations }: { slots: readonly TrafficSlot[]; refMin: number; violations: FifoViolation[] }) {
  const c = useChartColors()
  const data = travelTimeSteps(slots, refMin)
  const axis = { fontSize: 12, fill: c.ink2 }
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-semibold text-panel-ink">{fr.constraints.curveTitle} (min)</figcaption>
      <div className="h-48" role="img" aria-label={`${fr.constraints.curveTitle} : ${slots.map((s) => `${formatHm(s.from)}–${formatHm(s.to)} ${Math.round(refMin * s.factor)} min`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid stroke={c.grid} vertical={false} />
            <XAxis dataKey="hour" type="number" domain={[0, 24]} ticks={TICKS} tickFormatter={(h: number) => `${h} h`} tick={axis} stroke={c.grid} />
            <YAxis tick={axis} stroke={c.grid} width={44} tickFormatter={(m: number) => `${m}`} domain={[0, 'auto']} />
            {violations.map((v) => (
              <ReferenceLine key={v.at} x={v.at / 60} stroke={c.late} strokeDasharray="4 3" label={{ value: '!', position: 'top', fill: c.late, fontSize: 12, fontWeight: 700 }} />
            ))}
            <Tooltip
              cursor={{ stroke: c.ink2, strokeWidth: 1 }}
              contentStyle={{ background: c.surface, border: `1px solid ${c.grid}`, borderRadius: 12, color: c.ink, fontSize: 12 }}
              labelFormatter={(h) => `Départ ${formatHm(Number(h) * 60)}`}
              formatter={(m) => [`${String(m)} min`, 'Temps de parcours']}
            />
            <Line type="stepAfter" dataKey="minutes" stroke={c.series1} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-panel-ink-2">{fr.constraints.curveNote(refMin)}</p>
      <details className="text-xs text-panel-ink">
        <summary className="cursor-pointer text-panel-ink-2">{fr.constraints.tableView}</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-left text-panel-ink-2"><th scope="col">Tranche</th><th scope="col">Coefficient</th><th scope="col">Trajet de référence</th></tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.from}><td className="tabular-nums">{formatHm(s.from)}–{formatHm(s.to)}</td><td className="tabular-nums">× {s.factor}</td><td className="tabular-nums">{Math.round(refMin * s.factor * 10) / 10} min</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
