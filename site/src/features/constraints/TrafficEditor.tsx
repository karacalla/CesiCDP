/**
 * Rôle : édition des tranches de trafic. La contiguïté est garantie par construction : on ne saisit que la FIN
 *   d'une tranche (le début est la fin de la précédente) ; la dernière finit toujours à 24:00.
 *   Scinder coupe une tranche en deux ; fusionner la rattache à la précédente.
 */
import { useState } from 'react'
import { Merge, Split } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { fr } from '@/i18n/fr'
import { formatHm, parseHm } from '@/lib/time'
import { useVrp } from '@/store/vrp'
import { DAY_MAX, type TrafficSlot } from '@/types/vrp'

type Row = { to: string; factor: string }

const toRows = (slots: readonly TrafficSlot[]): Row[] => slots.map((s) => ({ to: formatHm(s.to), factor: String(s.factor) }))

export function TrafficEditor({ slots }: { slots: readonly TrafficSlot[] }) {
  const setTraffic = useVrp((s) => s.setTraffic)
  const [rows, setRows] = useState<Row[]>(() => toRows(slots))
  const [errors, setErrors] = useState<string[]>([])

  const build = (rs: Row[]): TrafficSlot[] | string => {
    const out: TrafficSlot[] = []
    let from = 0
    for (const [i, r] of rs.entries()) {
      const to = i === rs.length - 1 ? DAY_MAX : parseHm(r.to)
      const factor = Number(r.factor.replace(',', '.'))
      if (to === null) return `tranche ${i + 1} : ${fr.data.invalidTime}`
      if (!Number.isFinite(factor)) return `tranche ${i + 1} : coefficient non numérique`
      out.push({ from, to, factor })
      from = to
    }
    return out
  }
  const commit = (rs: Row[]): void => {
    const built = build(rs)
    setErrors(typeof built === 'string' ? [built] : setTraffic(built))
  }
  const edit = (i: number, patch: Partial<Row>): void => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  const split = (i: number): void => {
    const s = slots[i]
    if (!s) return
    const mid = Math.round((s.from + s.to) / 2 / 15) * 15
    if (mid <= s.from || mid >= s.to) return
    commit([...toRows(slots).slice(0, i), { to: formatHm(mid), factor: String(s.factor) }, ...toRows(slots).slice(i)])
  }
  const merge = (i: number): void => {
    const rs = toRows(slots)
    commit([...rs.slice(0, i - 1), { ...rs[i - 1], to: rs[i]?.to ?? '24:00', factor: rs[i - 1]?.factor ?? '1' }, ...rs.slice(i + 1)])
  }

  return (
    <div className="flex flex-col gap-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-panel-ink-2">
            <th scope="col" className="py-1 font-medium">{fr.constraints.from}</th>
            <th scope="col" className="py-1 font-medium">{fr.constraints.to}</th>
            <th scope="col" className="py-1 font-medium">{fr.constraints.factor}</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const last = i === rows.length - 1
            const from = slots[i]?.from ?? 0
            return (
              <tr key={i}>
                <td className="py-1 tabular-nums text-panel-ink-2">{formatHm(from)}</td>
                <td className="py-1 pr-2">
                  {last ? (
                    <span className="tabular-nums text-panel-ink-2">24:00</span>
                  ) : (
                    <input aria-label={`${fr.constraints.to} — tranche ${i + 1}`} value={r.to} onChange={(e) => edit(i, { to: e.target.value })} onBlur={() => commit(rows)} onKeyDown={(e) => e.key === 'Enter' && commit(rows)} className="h-8 w-20 rounded-lg border border-panel-line bg-panel-surface px-2 tabular-nums text-panel-ink" />
                  )}
                </td>
                <td className="py-1 pr-2">
                  <input aria-label={`${fr.constraints.factor} — tranche ${i + 1}`} inputMode="decimal" value={r.factor} onChange={(e) => edit(i, { factor: e.target.value })} onBlur={() => commit(rows)} onKeyDown={(e) => e.key === 'Enter' && commit(rows)} className="h-8 w-20 rounded-lg border border-panel-line bg-panel-surface px-2 tabular-nums text-panel-ink" />
                </td>
                <td className="flex justify-end gap-1 py-1">
                  <IconButton variant="panel" size={36} label={fr.constraints.split(i + 1)} icon={<Split size={16} aria-hidden />} onClick={() => split(i)} />
                  {i > 0 && <IconButton variant="panel" size={36} label={fr.constraints.merge(i + 1)} icon={<Merge size={16} aria-hidden />} onClick={() => merge(i)} />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div aria-live="polite">
        {errors.map((e) => (
          <p key={e} className="text-xs text-panel-ink"><span aria-hidden className="mr-1 font-bold text-panel-late">!</span>{e}</p>
        ))}
      </div>
    </div>
  )
}
