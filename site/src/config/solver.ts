/**
 * Rôle : ce que l'interface sait du solveur : algorithmes, capacités déclarées, réglages par défaut.
 * Les valeurs par défaut sont celles de `resoudre()` (algorithme/recuit_simple.py) et du réglage retenu par
 *   l'équipe (`reglage_choisi()` dans experiences.py : t0 = 0,5, t1 = 0,01, K = 20).
 * Capacités : état du solveur au 06/11/2026 (CLAUDE.md §6) : seul le PLNE traite fenêtres et trafic.
 *   À METTRE À JOUR dès que le recuit les prend en compte (ou à fournir par l'API).
 */
import type { Algo, AlgoCapabilities, SolveParams } from '@/types/vrp'

export const ALGOS: ReadonlyArray<{ id: Algo; label: string; description: string; capabilities: AlgoCapabilities }> = [
  { id: 'sa', label: 'Recuit simulé', description: 'Clarke et Wright puis recuit (4 mouvements) pendant une durée fixée.', capabilities: { timeWindows: false, traffic: false } },
  { id: 'clarke-wright', label: 'Clarke et Wright', description: 'Heuristique d’économies seule (solution de départ du recuit).', capabilities: { timeWindows: false, traffic: false } },
  { id: 'milp', label: 'PLNE (exact)', description: 'Modèle linéaire en nombres entiers (HiGHS) ; petites instances uniquement.', capabilities: { timeWindows: true, traffic: true } },
]

/** Noms et ordre des mouvements = NOMS_MOUVEMENTS du solveur. */
export const MOVE_NAMES = ['déplacer', 'échanger', '2-opt', '2-opt*'] as const

export const DEFAULT_PARAMS: SolveParams = {
  durationS: 10,
  seed: 0,
  K: 20,
  t0: 0.5,
  t1: 0.01,
  moveProbas: [0.4, 0.2, 0.2, 0.2],
  kMax: null,
}
