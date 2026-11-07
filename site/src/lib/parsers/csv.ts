/**
 * Rôle : lecture d'un fichier CSV de clients (séparateur « ; » ou « , » détecté, guillemets gérés).
 * Colonnes reconnues (insensibles à la casse et aux accents) :
 *   id · nom|name · lat|latitude · lng|lon|longitude · demande|demand|q · debut|a|tw_start · fin|b|tw_end · service|s
 *   Les heures acceptent « 08:30 », « 8h30 » ou un nombre de minutes.
 * Question probable du jury : « pourquoi ne pas utiliser une bibliothèque CSV ? » → 40 lignes suffisent pour notre
 *   format ; une dépendance de plus devrait passer par un ADR.
 */
import { parseHm } from '@/lib/time'
import { validateCustomer } from '@/lib/validation'
import { CustomerSchema, type Customer } from '@/types/vrp'
import type { ImportIssue, ImportResult } from './types'

const ALIASES: Record<string, string[]> = {
  id: ['id', 'client', 'numero', 'no'],
  name: ['nom', 'name', 'libelle'],
  lat: ['lat', 'latitude', 'y'],
  lng: ['lng', 'lon', 'long', 'longitude', 'x'],
  demand: ['demande', 'demand', 'q', 'quantite'],
  a: ['debut', 'a', 'tw_start', 'ouverture', 'ready'],
  b: ['fin', 'b', 'tw_end', 'fermeture', 'due'],
  service: ['service', 's', 'duree_service'],
}

const norm = (h: string): string => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s.-]+/g, '_')

/** Découpe une ligne CSV en champs (guillemets doubles, "" = guillemet échappé). */
export function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((f) => f.trim())
}

function num(text: string | undefined): number {
  if (text === undefined || text.trim() === '') return Number.NaN
  return Number(text.replace(',', '.'))
}

function time(text: string | undefined): number | null {
  if (text === undefined || text.trim() === '') return null
  const hm = parseHm(text)
  if (hm !== null) return hm
  const n = num(text)
  return Number.isFinite(n) ? n : Number.NaN
}

export function parseCsv(text: string): ImportResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const issues: ImportIssue[] = []
  const customers: Customer[] = []
  const headerLine = lines.findIndex((l) => l.trim() !== '')
  if (headerLine < 0) return { format: 'csv', instance: null, customers, issues: [{ line: 0, message: 'fichier vide' }], rows: 0 }

  const header = lines[headerLine] ?? ''
  const sep = (header.match(/;/g)?.length ?? 0) >= (header.match(/,/g)?.length ?? 0) ? ';' : ','
  const cols = splitCsvLine(header, sep).map(norm)
  const idx: Record<string, number> = {}
  for (const [key, names] of Object.entries(ALIASES)) idx[key] = cols.findIndex((c) => names.includes(c))
  for (const required of ['lat', 'lng', 'demand'] as const) {
    if ((idx[required] ?? -1) < 0) issues.push({ line: headerLine + 1, field: required, message: `colonne « ${ALIASES[required]?.[0]} » absente de l'en-tête` })
  }
  if (issues.length) return { format: 'csv', instance: null, customers, issues, rows: 0 }

  let rows = 0
  const seen = new Set<number>()
  for (let li = headerLine + 1; li < lines.length; li++) {
    const raw = lines[li] ?? ''
    if (raw.trim() === '') continue
    rows++
    const f = splitCsvLine(raw, sep)
    const get = (k: string): string | undefined => ((idx[k] ?? -1) >= 0 ? f[idx[k] ?? 0] : undefined)
    const id = (idx.id ?? -1) >= 0 ? num(get('id')) : rows
    const a = time(get('a'))
    const b = time(get('b'))
    const candidate = {
      id,
      name: get('name') || `Client ${id}`,
      lat: num(get('lat')),
      lng: num(get('lng')),
      demand: num(get('demand')),
      tw: a === null && b === null ? null : { a: a ?? Number.NaN, b: b ?? Number.NaN },
      service: (idx.service ?? -1) >= 0 ? (time(get('service')) ?? 0) : 0,
    }
    const errors = validateCustomer(candidate)
    if (Number.isInteger(id) && seen.has(id)) errors.push({ field: 'id', message: `identifiant ${id} en double` })
    if (errors.length) {
      for (const e of errors) issues.push({ line: li + 1, field: e.field, message: e.message })
      continue
    }
    seen.add(id)
    customers.push(CustomerSchema.parse(candidate))
  }
  return { format: 'csv', instance: null, customers, issues, rows }
}
