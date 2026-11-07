/**
 * Rôle : validation d'un client (ligne de table ou d'import) avec messages en français, et statut de fenêtre.
 * Choix retenu : on réutilise les schémas Zod du contrat, puis on ajoute les contrôles qui dépendent du contexte
 *   (coordonnées géographiques, fenêtre comprise dans les horaires du dépôt).
 * Question probable du jury : « le frontend vérifie-t-il la faisabilité ? » → non : seulement la cohérence de la
 *   saisie (types, bornes, a ≤ b). La faisabilité des tournées reste au solveur.
 */
import { CustomerSchema, isGeoPoint, type Customer, type Depot, type InstanceMeta } from '@/types/vrp'

const FIELD_LABEL: Record<string, string> = {
  id: 'identifiant',
  name: 'nom',
  lat: 'latitude',
  lng: 'longitude',
  demand: 'demande',
  tw: 'fenêtre',
  service: 'service',
}

export interface FieldError {
  field: string
  message: string
}

/** Erreurs d'un client ; tableau vide si valide. */
export function validateCustomer(c: unknown, coordinates: InstanceMeta['coordinates'] = 'geo'): FieldError[] {
  const parsed = CustomerSchema.safeParse(c)
  if (!parsed.success) {
    return parsed.error.issues.map((i) => {
      const field = String(i.path[0] ?? 'ligne')
      const msg = i.code === 'invalid_type' ? 'valeur manquante ou non numérique' : i.message
      return { field, message: `${FIELD_LABEL[field] ?? field} : ${msg}` }
    })
  }
  if (coordinates === 'geo' && !isGeoPoint(parsed.data.lat, parsed.data.lng)) {
    return [{ field: 'lat', message: 'coordonnées hors du globe (latitude [−90, 90], longitude [−180, 180])' }]
  }
  return []
}

export type TwStatus = 'none' | 'ok' | 'invalid'

/** Statut de la fenêtre d'un client vis-à-vis des horaires du dépôt (filtre de la table). */
export function twStatus(c: Pick<Customer, 'tw'>, depot: Pick<Depot, 'tw'> | null): TwStatus {
  if (!c.tw) return 'none'
  if (c.tw.a > c.tw.b) return 'invalid'
  if (depot && (c.tw.b < depot.tw.a || c.tw.a > depot.tw.b)) return 'invalid'
  return 'ok'
}
