/**
 * Rôle : lecture d'une instance CVRP au format VRPLIB (.vrp, ex. jeu X d'Uchoa et al. 2017).
 * Même convention que `lire_instance` du solveur (algorithme/recuit_simple.py) : le dépôt devient le nœud 0,
 *   les clients sont renumérotés 1…n dans l'ordre du fichier.
 * Limites : EUC_2D seulement (comme le solveur) ; coordonnées planes → instance marquée `planar` (pas de carte).
 */
import { CustomerSchema, type Customer } from '@/types/vrp'
import { toInstance, type ImportIssue, type ImportResult } from './types'

const DEFAULT_TRAFFIC = { slots: [{ from: 0, to: 1440, factor: 1 }] }

export function parseVrplib(text: string, fileName = 'instance.vrp'): ImportResult {
  const issues: ImportIssue[] = []
  const header: Record<string, string> = {}
  const coords = new Map<number, { x: number; y: number; line: number }>()
  const demands = new Map<number, number>()
  const depots: number[] = []
  let section = ''
  const lines = text.split(/\r?\n/)

  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (line === '' || line === 'EOF') return
    if (/_SECTION$/.test(line)) {
      section = line
      return
    }
    const kv = /^([A-Z_]+)\s*:\s*(.*)$/.exec(line)
    if (kv?.[1] && kv[2] !== undefined && section === '') {
      header[kv[1]] = kv[2].replace(/^"|"$/g, '').trim()
      return
    }
    const parts = line.split(/\s+/).map(Number)
    const bad = (): void => void issues.push({ line: i + 1, message: `ligne illisible dans ${section || 'l’en-tête'}` })
    if (section === 'NODE_COORD_SECTION') {
      const [id, x, y] = parts
      if (id === undefined || x === undefined || y === undefined || [id, x, y].some((v) => !Number.isFinite(v))) return bad()
      coords.set(id, { x, y, line: i + 1 })
    } else if (section === 'DEMAND_SECTION') {
      const [id, q] = parts
      if (id === undefined || q === undefined || !Number.isFinite(id) || !Number.isFinite(q)) return bad()
      demands.set(id, q)
    } else if (section === 'DEPOT_SECTION') {
      const id = parts[0]
      if (id !== undefined && id > 0) depots.push(id)
    }
  })

  const type = header.EDGE_WEIGHT_TYPE ?? 'EUC_2D'
  if (type !== 'EUC_2D') issues.push({ line: 0, field: 'EDGE_WEIGHT_TYPE', message: `type de distance « ${type} » non pris en charge (EUC_2D seulement, comme le solveur)` })
  const Q = Number(header.CAPACITY)
  if (!(Q > 0)) issues.push({ line: 0, field: 'CAPACITY', message: 'capacité absente ou invalide' })
  const depotId = depots[0] ?? 1
  const depot = coords.get(depotId)
  if (!depot) issues.push({ line: 0, message: `dépôt (nœud ${depotId}) sans coordonnées` })
  if (issues.length) return { format: 'vrplib', instance: null, customers: [], issues, rows: coords.size }

  const customers: Customer[] = []
  let n = 0
  for (const [id, p] of [...coords.entries()].sort((a, b) => a[0] - b[0])) {
    if (id === depotId) continue
    n++
    const candidate = { id: n, name: `Client ${n} (nœud ${id})`, lat: p.y, lng: p.x, demand: demands.get(id) ?? Number.NaN, tw: null, service: 0 }
    const parsed = CustomerSchema.safeParse(candidate)
    if (parsed.success) customers.push(parsed.data)
    else issues.push({ line: p.line, message: `nœud ${id} : ${parsed.error.issues[0]?.message ?? 'invalide'}` })
  }
  const name = header.NAME || fileName.replace(/\.vrp$/i, '')
  const kFromName = /-k(\d+)/i.exec(name)?.[1]
  const k = Number(header.VEHICLES ?? kFromName ?? Math.max(1, Math.ceil(customers.reduce((s, c) => s + c.demand, 0) / (Q || 1))))
  const instance = toInstance({
    id: name,
    name,
    depot: { name: `Dépôt (nœud ${depotId})`, lat: depot?.y ?? 0, lng: depot?.x ?? 0, tw: { a: 0, b: 1440 } },
    customers,
    fleet: { k, Q, fixedCost: 0, baseSpeedKmh: 50 },
    traffic: DEFAULT_TRAFFIC,
    options: { timeWindows: 'off', allowWait: true },
    meta: { source: 'vrplib', coordinates: 'planar', bksObjective: 'Somme des distances euclidiennes arrondies (EUC_2D), sans fenêtre ni trafic', note: header.COMMENT },
  }, issues)
  return { format: 'vrplib', instance, customers, issues, rows: coords.size }
}
