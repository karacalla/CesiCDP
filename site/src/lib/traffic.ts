/**
 * Rôle : ILLUSTRATION du modèle de trafic dans l'éditeur (courbe d'un trajet de référence, contrôle FIFO).
 *   Ce n'est pas le calcul du solveur : aucune tournée n'est planifiée ici.
 * Modèle illustré (à confirmer par l'équipe solveur) : temps de parcours = temps hors trafic × coefficient de la
 *   tranche de DÉPART. Avec ce modèle, toute BAISSE de coefficient d'une tranche à la suivante permet d'arriver plus
 *   tôt en partant plus tard (violation de la propriété FIFO) : partir juste avant la frontière b arrive à
 *   b + T·d_i, partir à b arrive à b + T·d_{i+1} < b + T·d_i.
 * Question probable du jury : « comment rendre le modèle FIFO ? » → faire varier la VITESSE par tranche et
 *   intégrer le trajet à travers les frontières (Ichoua, Gendreau, Potvin, 2003).
 */
import type { TrafficSlot } from '@/types/vrp'

export interface FifoViolation {
  /** Frontière entre deux tranches (minutes). */
  at: number
  before: number
  after: number
  /** Pour le trajet de référence : arrivée en partant 1 min avant la frontière, puis en partant à la frontière. */
  arrivalIfJustBefore: number
  arrivalIfAt: number
}

export function factorAt(slots: readonly TrafficSlot[], t: number): number {
  return slots.find((s) => t >= s.from && t < s.to)?.factor ?? slots.at(-1)?.factor ?? 1
}

/** Les coefficients diffèrent-ils de 1 quelque part ? (sinon le trafic est sans effet) */
export function isTrafficActive(slots: readonly TrafficSlot[]): boolean {
  return slots.some((s) => s.factor !== 1)
}

export function fifoViolations(slots: readonly TrafficSlot[], refMin: number): FifoViolation[] {
  const out: FifoViolation[] = []
  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1]
    const cur = slots[i]
    if (!prev || !cur || cur.factor >= prev.factor) continue
    out.push({
      at: cur.from,
      before: prev.factor,
      after: cur.factor,
      arrivalIfJustBefore: cur.from - 1 + refMin * prev.factor,
      arrivalIfAt: cur.from + refMin * cur.factor,
    })
  }
  return out
}

/** Points d'une courbe en escalier : temps de parcours du trajet de référence selon l'heure de départ. */
export function travelTimeSteps(slots: readonly TrafficSlot[], refMin: number): Array<{ hour: number; minutes: number }> {
  const pts = slots.map((s) => ({ hour: s.from / 60, minutes: Math.round(refMin * s.factor * 10) / 10 }))
  const last = slots.at(-1)
  if (last) pts.push({ hour: last.to / 60, minutes: Math.round(refMin * last.factor * 10) / 10 })
  return pts
}
