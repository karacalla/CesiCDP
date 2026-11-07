/**
 * Rôle : formulaire du dépôt (nom, position, horaires d'ouverture). Validé par DepotSchema à la sortie d'un champ.
 */
import { useCallback } from 'react'
import { Field } from '@/components/ui/Field'
import { Section } from '@/components/ui/Section'
import { fr } from '@/i18n/fr'
import { formatHm, parseHm } from '@/lib/time'
import { useVrp } from '@/store/vrp'
import { DepotSchema, type Depot } from '@/types/vrp'
import { useDraft, type Draft } from './useDraft'

type K = 'name' | 'lat' | 'lng' | 'a' | 'b'

function toDraft(d: Depot): Draft<K> {
  return { name: d.name, lat: String(d.lat), lng: String(d.lng), a: formatHm(d.tw.a), b: formatHm(d.tw.b) }
}

function DepotFields({ depot }: { depot: Depot }) {
  const setDepot = useVrp((s) => s.setDepot)
  const commit = useCallback(
    (d: Draft<K>) => {
      const errors: Partial<Record<K, string>> = {}
      const a = parseHm(d.a)
      const b = parseHm(d.b)
      if (a === null) errors.a = fr.data.invalidTime
      if (b === null) errors.b = fr.data.invalidTime
      const candidate = { name: d.name, lat: Number(d.lat.replace(',', '.')), lng: Number(d.lng.replace(',', '.')), tw: { a: a ?? Number.NaN, b: b ?? Number.NaN } }
      const p = DepotSchema.safeParse(candidate)
      if (!p.success) {
        for (const i of p.error.issues) {
          const key = (i.path[0] === 'tw' ? (i.path[1] ?? 'a') : i.path[0]) as K
          errors[key] ??= i.code === 'invalid_type' ? 'valeur numérique attendue' : i.message
        }
      }
      if (Object.keys(errors).length === 0) setDepot(candidate)
      return errors
    },
    [setDepot],
  )
  const { field } = useDraft<K>(toDraft(depot), commit)
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field className="col-span-2" label={fr.data.name} {...field('name')} />
      <Field label={fr.data.lat} inputMode="decimal" {...field('lat')} />
      <Field label={fr.data.lng} inputMode="decimal" {...field('lng')} />
      <Field label={fr.data.opening} placeholder="07:00" {...field('a')} />
      <Field label={fr.data.closing} placeholder="19:00" {...field('b')} />
    </div>
  )
}

export function DepotForm() {
  const depot = useVrp((s) => s.instance?.depot)
  const id = useVrp((s) => s.instance?.id)
  if (!depot) return null
  return (
    <Section title={fr.data.depot}>
      {/* `key` : le brouillon repart de zéro quand on change d'instance */}
      <DepotFields key={id} depot={depot} />
    </Section>
  )
}
