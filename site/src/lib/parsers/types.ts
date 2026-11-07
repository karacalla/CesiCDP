/**
 * Rôle : résultat commun des parseurs d'import (CSV, JSON, VRPLIB, Solomon).
 */
import { InstanceSchema, type Customer, type Instance } from '@/types/vrp'

export type ImportFormat = 'csv' | 'json' | 'vrplib' | 'solomon'

export interface ImportIssue {
  /** Numéro de ligne dans le fichier (1 = première ligne), ou 0 pour une erreur globale. */
  line: number
  field?: string
  message: string
}

export interface ImportResult {
  format: ImportFormat
  /** Instance complète si le fichier en décrit une (JSON complet, VRPLIB, Solomon). */
  instance: Instance | null
  /** Clients valides (les lignes en erreur sont écartées). */
  customers: Customer[]
  issues: ImportIssue[]
  /** Nombre de lignes de données lues. */
  rows: number
}

/** Valide une instance construite par un parseur ; ajoute les erreurs au lieu de lever une exception. */
export function toInstance(candidate: unknown, issues: ImportIssue[]): Instance | null {
  const p = InstanceSchema.safeParse(candidate)
  if (p.success) return p.data
  for (const e of p.error.issues.slice(0, 50)) issues.push({ line: 0, field: e.path.join('.'), message: e.message })
  return null
}
