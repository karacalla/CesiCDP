/**
 * Rôle : choix du parseur selon l'extension (et le contenu en cas de doute), point d'entrée du Web Worker.
 */
import { CustomerSchema, InstanceSchema } from '@/types/vrp'
import { parseCsv } from './csv'
import { parseSolomon } from './solomon'
import type { ImportIssue, ImportResult } from './types'
import { parseVrplib } from './vrplib'

export type { ImportFormat, ImportIssue, ImportResult } from './types'

function parseJson(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (e) {
    return { format: 'json', instance: null, customers: [], issues: [{ line: 0, message: `JSON invalide : ${(e as Error).message}` }], rows: 0 }
  }
  if (Array.isArray(data)) {
    const issues: ImportIssue[] = []
    const customers = data.flatMap((row, i) => {
      const p = CustomerSchema.safeParse(row)
      if (p.success) return [p.data]
      for (const e of p.error.issues) issues.push({ line: i + 1, field: String(e.path[0] ?? ''), message: `élément ${i + 1} : ${e.message}` })
      return []
    })
    return { format: 'json', instance: null, customers, issues, rows: data.length }
  }
  const p = InstanceSchema.safeParse(data)
  if (p.success) return { format: 'json', instance: p.data, customers: p.data.customers, issues: [], rows: p.data.customers.length }
  return {
    format: 'json',
    instance: null,
    customers: [],
    issues: p.error.issues.slice(0, 200).map((e) => ({ line: 0, field: e.path.join('.'), message: e.message })),
    rows: 0,
  }
}

export function parseFile(name: string, text: string): ImportResult {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'json') return parseJson(text)
  if (ext === 'vrp' || /NODE_COORD_SECTION/.test(text)) return parseVrplib(text, name)
  if (ext === 'txt' && /CUST\s*NO/i.test(text)) return parseSolomon(text, name)
  return parseCsv(text)
}
