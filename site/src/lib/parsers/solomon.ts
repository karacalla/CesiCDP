/**
 * Rôle : lecture d'une instance VRPTW au format Solomon / Gehring-Homberger (.txt).
 *   Ligne 0 du tableau CUSTOMER = dépôt (sa fenêtre = horizon) ; colonnes : n°, X, Y, demande, début, fin, service.
 * Les unités de temps de ces jeux sont abstraites (temps = distance) : elles sont conservées telles quelles
 *   et l'instance est marquée `planar`.
 */
import { CustomerSchema, type Customer } from '@/types/vrp'
import { toInstance, type ImportIssue, type ImportResult } from './types'

export function parseSolomon(text: string, fileName = 'instance.txt'): ImportResult {
  const lines = text.split(/\r?\n/)
  const issues: ImportIssue[] = []
  const name = lines.find((l) => l.trim() !== '')?.trim() || fileName.replace(/\.txt$/i, '')

  const vehIdx = lines.findIndex((l) => /NUMBER\s+CAPACITY/i.test(l))
  const fleetNums = vehIdx >= 0 ? (lines.slice(vehIdx + 1).find((l) => l.trim() !== '') ?? '').trim().split(/\s+/).map(Number) : []
  const [k, Q] = fleetNums
  if (!(k && k > 0 && Q && Q > 0)) issues.push({ line: vehIdx + 2, message: 'bloc VEHICLE (NUMBER, CAPACITY) absent ou invalide' })

  const custIdx = lines.findIndex((l) => /CUST\s*NO/i.test(l))
  if (custIdx < 0) issues.push({ line: 0, message: 'tableau CUSTOMER introuvable' })
  if (issues.length) return { format: 'solomon', instance: null, customers: [], issues, rows: 0 }

  const customers: Customer[] = []
  let depot: { x: number; y: number; a: number; b: number } | null = null
  let rows = 0
  for (let i = custIdx + 1; i < lines.length; i++) {
    const t = (lines[i] ?? '').trim()
    if (t === '') continue
    rows++
    const v = t.split(/\s+/).map(Number)
    if (v.length < 7 || v.some((x) => !Number.isFinite(x))) {
      issues.push({ line: i + 1, message: 'ligne illisible : 7 nombres attendus (n°, X, Y, demande, début, fin, service)' })
      continue
    }
    const [no = 0, x = 0, y = 0, q = 0, a = 0, b = 0, s = 0] = v
    if (no === 0) {
      depot = { x, y, a, b }
      continue
    }
    const parsed = CustomerSchema.safeParse({ id: no, name: `Client ${no}`, lat: y, lng: x, demand: q, tw: { a, b }, service: s })
    if (parsed.success) customers.push(parsed.data)
    else for (const e of parsed.error.issues) issues.push({ line: i + 1, field: String(e.path[0] ?? ''), message: e.message })
  }
  if (!depot) {
    issues.push({ line: custIdx + 2, message: 'dépôt (client 0) absent' })
    return { format: 'solomon', instance: null, customers, issues, rows }
  }
  const instance = toInstance({
    id: name,
    name,
    depot: { name: 'Dépôt (client 0)', lat: depot.y, lng: depot.x, tw: { a: depot.a, b: depot.b } },
    customers,
    fleet: { k, Q, fixedCost: 0, baseSpeedKmh: 50 },
    traffic: { slots: [{ from: 0, to: 1440, factor: 1 }] },
    options: { timeWindows: 'strict', allowWait: true },
    meta: { source: 'solomon', coordinates: 'planar', bksObjective: 'Lexicographique : nombre de véhicules, puis distance totale (convention Solomon / SINTEF)' },
  }, issues)
  return { format: 'solomon', instance, customers, issues, rows }
}
