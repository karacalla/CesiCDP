/**
 * Rôle : quelles contraintes sont ACTIVES pour une instance, et lesquelles un algorithme ne traite pas.
 * Règle (critère P3) : une contrainte activée mais non traitée est affichée « non prise en compte » et le résultat
 *   est marqué en conséquence ; jamais de résultat présenté comme conforme alors qu'il ne l'est pas.
 */
import { ALGOS } from '@/config/solver'
import { isTrafficActive } from '@/lib/traffic'
import type { Algo, Instance, SolveResult } from '@/types/vrp'

export type Constraint = SolveResult['ignoredConstraints'][number]

export function activeConstraints(inst: Instance): Constraint[] {
  const out: Constraint[] = []
  if (inst.options.timeWindows === 'strict' && inst.customers.some((c) => c.tw)) out.push('timeWindows')
  if (isTrafficActive(inst.traffic.slots)) out.push('traffic')
  return out
}

export function ignoredBy(algo: Algo, inst: Instance): Constraint[] {
  const caps = ALGOS.find((a) => a.id === algo)?.capabilities
  return activeConstraints(inst).filter((c) => !caps?.[c])
}
