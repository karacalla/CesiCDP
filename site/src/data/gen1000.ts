/**
 * Rôle : instance générée GEN-1000 (1000 clients fictifs, graine fixe, sans tracé) pour les tests de charge.
 * Choix retenu : générée à la demande (≈ 2 ms) plutôt que stockée (≈ 150 Ko de JSON en moins dans le dépôt).
 */
import { mulberry32, randInt } from '@/lib/random'
import type { Customer, Instance } from '@/types/vrp'

export const GEN1000_SEED = 1000

export function makeGen1000(n = 1000, seed = GEN1000_SEED): Instance {
  const rng = mulberry32(seed)
  // boîte Lorraine–Vosges : 47,95–48,95 N, 5,9–7,1 E
  const customers: Customer[] = Array.from({ length: n }, (_, i) => {
    const hasTw = rng() < 0.85
    const a = randInt(rng, 8 * 4, 15 * 4) * 15 // quart d'heure entre 08:00 et 15:00
    return {
      id: i + 1,
      name: `Client ${String(i + 1).padStart(4, '0')}`,
      lat: Math.round((47.95 + rng()) * 1e5) / 1e5,
      lng: Math.round((5.9 + rng() * 1.2) * 1e5) / 1e5,
      demand: randInt(rng, 1, 10),
      tw: hasTw ? { a, b: a + randInt(rng, 4, 12) * 15 } : null,
      service: randInt(rng, 5, 15),
    }
  })
  return {
    id: 'GEN-1000',
    name: `GEN-${n} — instance générée (graine ${seed})`,
    depot: { name: 'Dépôt fictif — Nancy', lat: 48.6862, lng: 6.2045, tw: { a: 7 * 60, b: 19 * 60 } },
    customers,
    fleet: { k: 60, Q: 100, fixedCost: 0, baseSpeedKmh: 50 },
    traffic: {
      slots: [
        { from: 0, to: 450, factor: 1 },
        { from: 450, to: 570, factor: 1.6 },
        { from: 570, to: 990, factor: 1.15 },
        { from: 990, to: 1440, factor: 1.45 },
      ],
    },
    options: { timeWindows: 'strict', allowWait: true },
    meta: { source: 'generated', coordinates: 'geo', note: `Clients fictifs tirés uniformément (graine ${seed}) ; pas de tracé routier.` },
  }
}
