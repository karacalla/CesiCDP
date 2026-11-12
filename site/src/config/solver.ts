/**
 * Rôle : ce que l'interface sait du solveur : algorithmes, capacités déclarées, réglages par défaut.
 * Les valeurs par défaut sont celles de `resoudre()` (algorithme/recuit_simple.py, version niveau A) et du réglage
 *   retenu par l'équipe (`REGLAGE_RETENU` dans experiences.py : t0 = 2, t1 = 0,01, K = 20 ; notebook final §8.1).
 * Capacités : état du solveur au 12/11/2026 (branche niveau-A) : le recuit et Clarke-Wright traitent les fenêtres
 *   de temps (contrôle `horaires_ok`) ; le trafic par tranche horaire n'est traité que par le PLNE.
 *   À METTRE À JOUR dès que le recuit prend le trafic en compte (ou à fournir par l'API).
 */
import type { Algo, AlgoCapabilities, SolveParams } from '@/types/vrp'

export const ALGOS: ReadonlyArray<{ id: Algo; label: string; description: string; capabilities: AlgoCapabilities }> = [
  { id: 'sa', label: 'Recuit simulé', description: 'Clarke et Wright puis recuit (5 mouvements) pendant une durée fixée.', capabilities: { timeWindows: true, traffic: false } },
  { id: 'clarke-wright', label: 'Clarke et Wright', description: 'Heuristique d’économies seule (solution de départ du recuit).', capabilities: { timeWindows: true, traffic: false } },
  { id: 'milp', label: 'PLNE (exact)', description: 'Modèle linéaire en nombres entiers (HiGHS) ; petites instances uniquement.', capabilities: { timeWindows: true, traffic: true } },
]

/** Noms et ordre des mouvements = NOMS_MOUVEMENTS du solveur. */
export const MOVE_NAMES = ['déplacer', 'échanger', '2-opt', '2-opt*', 'nouvelle tournée'] as const

export const DEFAULT_PARAMS: SolveParams = {
  durationS: 10,
  seed: 0,
  K: 20,
  t0: 2,
  t1: 0.01,
  // PROBAS_FENETRES du solveur : les instances du dispatcher ont des fenêtres de temps
  // (sans fenêtres, le solveur utilise PROBAS_DEFAUT = [0.4, 0.2, 0.2, 0.2, 0])
  moveProbas: [0.395, 0.2, 0.2, 0.2, 0.005],
  kMax: null,
}
