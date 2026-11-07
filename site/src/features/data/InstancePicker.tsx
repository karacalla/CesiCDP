/**
 * Rôle : choix de l'instance de travail (démonstration ou générée) et rappel de sa provenance.
 */
import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { Section } from '@/components/ui/Section'
import { fr } from '@/i18n/fr'
import { api, type InstanceSummary } from '@/services/api'
import { useVrp } from '@/store/vrp'

export function InstancePicker() {
  const [list, setList] = useState<InstanceSummary[]>([])
  const instance = useVrp((s) => s.instance)
  const status = useVrp((s) => s.status)
  const load = useVrp((s) => s.load)
  useEffect(() => {
    void api.listInstances().then(setList)
  }, [])

  const known = list.some((i) => i.id === instance?.id)
  return (
    <Section title={fr.data.instance} aside={api.mode === 'mock' ? <span className="rounded-full bg-panel px-2.5 py-1 text-xs font-semibold text-panel-accent-ink">{fr.data.simulated}</span> : null}>
      <label className="flex flex-col gap-1 text-xs font-medium text-panel-ink-2">
        {fr.data.instanceLabel}
        <select
          value={known ? instance?.id : ''}
          disabled={status === 'loading'}
          onChange={(e) => void load(e.target.value)}
          className="h-10 rounded-xl border border-panel-line bg-panel-surface px-3 text-sm text-panel-ink"
        >
          {!known && <option value="">{instance?.name ?? '—'}</option>}
          {list.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </label>
      {instance && (
        <p className="flex gap-2 text-xs text-panel-ink-2">
          <Info size={14} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            {instance.customers.length} clients · {instance.fleet.k} camions · Q = {instance.fleet.Q}
            {instance.meta.note ? ` · ${instance.meta.note}` : ''}
            {instance.meta.coordinates === 'planar' ? ` ${fr.data.planar}` : ''}
          </span>
        </p>
      )}
      {status === 'loading' && <p className="text-xs text-panel-ink-2">{fr.data.loading}</p>}
    </Section>
  )
}
