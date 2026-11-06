/**
 * Rôle : générateur pseudo-aléatoire à graine (données simulées reproductibles).
 * Choix retenu : mulberry32 (32 bits, 6 lignes, période 2^32, largement suffisant pour des données de démonstration).
 * Alternative écartée : Math.random() (non initialisable → démonstration non reproductible, interdit par CLAUDE.md §7).
 * Question probable du jury : « pourquoi pas le même générateur que Python ? » → le frontend ne refait jamais
 *   le calcul du solveur ; il lui faut seulement des données de démonstration stables.
 */

export type Rng = () => number

/** Retourne une fonction qui produit des réels uniformes dans [0, 1), identiques pour une même graine. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Entier uniforme dans [min, max]. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}
