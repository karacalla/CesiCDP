/**
 * Rôle : formulaire de la flotte homogène (k camions de capacité Q, coût fixe, vitesse de référence).
 */
import { useCallback } from 'react'
import { Field } from '@/components/ui/Field'
import { Section } from '@/components/ui/Section'
import { fr } from '@/i18n/fr'
import { useVrp } from '@/store/vrp'
import { FleetSchema, type Fleet } from '@/types/vrp'
import { useDraft, type Draft } from './useDraft'

type K = 'k' | 'Q' | 'fixedCost' | 'baseSpeedKmh'

const toDraft = (f: Fleet): Draft<K> => ({ k: String(f.k), Q: String(f.Q), fixedCost: String(f.fixedCost), baseSpeedKmh: String(f.baseSpeedKmh) })
const num = (s: string): number => (s.trim() === '' ? Number.NaN : Number(s.replace(',', '.')))

function FleetFields({ fleet }: { fleet: Fleet }) {
  const setFleet = useVrp((s) => s.setFleet)
  const commit = useCallback(
    (d: Draft<K>) => {
      const candidate = { k: num(d.k), Q: num(d.Q), fixedCost: num(d.fixedCost), baseSpeedKmh: num(d.baseSpeedKmh) }
      const p = FleetSchema.safeParse(candidate)
      if (p.success) {
        setFleet(p.data)
        return {}
      }
      const errors: Partial<Record<K, string>> = {}
      for (const i of p.error.issues) errors[i.path[0] as K] ??= i.code === 'invalid_type' ? 'valeur numérique attendue' : i.message
      return errors
    },
    [setFleet],
  )
  const { field } = useDraft<K>(toDraft(fleet), commit)
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={fr.data.k} inputMode="numeric" {...field('k')} />
      <Field label={fr.data.Q} inputMode="decimal" {...field('Q')} />
      <Field label={fr.data.fixedCost} inputMode="decimal" {...field('fixedCost')} />
      <Field label={fr.data.speed} inputMode="decimal" {...field('baseSpeedKmh')} />
    </div>
  )
}

export function FleetForm() {
  const fleet = useVrp((s) => s.instance?.fleet)
  const id = useVrp((s) => s.instance?.id)
  const total = useVrp((s) => s.instance?.customers.reduce((sum, c) => sum + c.demand, 0) ?? 0)
  if (!fleet) return null
  const capacity = fleet.k * fleet.Q
  return (
    <Section title={fr.data.fleet} aside={<span className="text-xs text-panel-ink-2">Demande totale {total} / capacité {capacity}</span>}>
      <FleetFields key={id} fleet={fleet} />
    </Section>
  )
}
