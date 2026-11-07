/**
 * Rôle : convergence en direct : coût (courant et meilleur) et température, en DEUX graphiques sur le même axe
 *   des temps (jamais deux échelles verticales sur un même graphique). ≤ 500 points (pas ≈ 0,5 s).
 * Lecture : légende + couleurs validées (dataviz) ; info-bulle à réticule ; tableau équivalent repliable.
 */
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import { fr } from '@/i18n/fr'
import type { HistoryPoint } from '@/types/vrp'

const fmt = (v: number, d = 1): string => v.toLocaleString('fr-FR', { maximumFractionDigits: d })

export function ConvergenceCharts({ history, durationS }: { history: HistoryPoint[]; durationS: number }) {
  const c = useChartColors()
  const axis = { fontSize: 12, fill: c.ink2 }
  const tooltip = { contentStyle: { background: c.surface, border: `1px solid ${c.grid}`, borderRadius: 12, color: c.ink, fontSize: 12 }, cursor: { stroke: c.ink2, strokeWidth: 1 } }
  const xAxis = <XAxis dataKey="t" type="number" domain={[0, durationS]} tick={axis} stroke={c.grid} tickFormatter={(t: number) => `${fmt(t, 0)} s`} />
  const last = history.at(-1)
  return (
    <div className="flex flex-col gap-4">
      <figure className="flex flex-col gap-1">
        <figcaption className="text-sm font-semibold text-panel-ink">{fr.run.costChart}</figcaption>
        <div className="h-48" role="img" aria-label={last ? `${fr.run.costChart} : courant ${fmt(last.cost)}, meilleur ${fmt(last.best)} à ${fmt(last.t)} s` : fr.run.costChart}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke={c.grid} vertical={false} />
              {xAxis}
              <YAxis tick={axis} stroke={c.grid} width={52} domain={['auto', 'auto']} tickFormatter={(v: number) => fmt(v, 0)} />
              <Tooltip {...tooltip} labelFormatter={(t) => `t = ${fmt(Number(t))} s`} formatter={(v, name) => [fmt(Number(v)), name === 'best' ? fr.run.best : fr.run.current]} />
              <Legend verticalAlign="top" height={24} iconType="plainline" formatter={(name: string) => (name === 'best' ? fr.run.best : fr.run.current)} />
              <Line dataKey="best" name="best" stroke={c.series2} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="cost" name="cost" stroke={c.series1} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <figure className="flex flex-col gap-1">
        <figcaption className="text-sm font-semibold text-panel-ink">{fr.run.tempChart}</figcaption>
        <div className="h-36" role="img" aria-label={last ? `${fr.run.tempChart} : ${fmt(last.temp, 3)} à ${fmt(last.t)} s` : fr.run.tempChart}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke={c.grid} vertical={false} />
              {xAxis}
              <YAxis tick={axis} stroke={c.grid} width={52} tickFormatter={(v: number) => fmt(v, 2)} />
              <Tooltip {...tooltip} labelFormatter={(t) => `t = ${fmt(Number(t))} s`} formatter={(v) => [fmt(Number(v), 3), fr.run.tempChart]} />
              <Line dataKey="temp" stroke={c.series1} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <details className="text-xs text-panel-ink">
        <summary className="cursor-pointer text-panel-ink-2">{fr.constraints.tableView}</summary>
        <table className="mt-2 w-full tabular-nums">
          <thead>
            <tr className="text-left text-panel-ink-2"><th scope="col">{fr.run.time}</th><th scope="col">{fr.run.current}</th><th scope="col">{fr.run.best}</th><th scope="col">{fr.run.tempChart}</th></tr>
          </thead>
          <tbody>
            {history.filter((_, i) => i % 4 === 0 || i === history.length - 1).map((h) => (
              <tr key={h.t}><td>{fmt(h.t)}</td><td>{fmt(h.cost)}</td><td>{fmt(h.best)}</td><td>{fmt(h.temp, 3)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
