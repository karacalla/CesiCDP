/**
 * Rôle : calcul SIMULÉ (mode mock) : déroule une courbe de convergence en temps réel puis renvoie le résultat
 *   simulé de NANCY-60 (ADR-011). Refuse tout cas où il produirait un faux résultat :
 *   - PLNE et Clarke-Wright seul (seule une solution « recuit » est simulée) ;
 *   - instance autre que NANCY-60, ou NANCY-60 modifiée (clients, dépôt, flotte ou trafic).
 * La courbe est déterministe (graine) ; la température suit la formule du solveur :
 *   T(t) = T0 · (T1/T0)^(t/durée), T0 = t0 · trajet moyen, T1 = t1 · trajet moyen.
 * Question probable du jury : « votre courbe est-elle réelle ? » → non, elle est simulée et étiquetée comme telle ;
 *   seuls ses deux extrémités (coût initial et final) proviennent du résultat simulé commité.
 */
import { activeConstraints, ignoredBy } from '@/lib/constraints'
import { mulberry32 } from '@/lib/random'
import { SolveResultSchema, type HistoryPoint, type Instance, type SolveRequest, type SolveResult } from '@/types/vrp'
import { RunCancelled, type RunHandle, type RunProgress } from './types'

const STEP_S = 0.5
const TICK_MS = 100
const MAX_POINTS = 500

/** Empreinte des données qui déterminent la solution simulée. */
function fingerprint(i: Instance): string {
  return JSON.stringify([i.customers, i.depot, i.fleet, i.traffic])
}

async function fixture(): Promise<{ instance: Instance; result: SolveResult }> {
  const [inst, res] = await Promise.all([import('@/data/nancy-60.instance.json'), import('@/data/nancy-60.result.json')])
  return { instance: inst.default as unknown as Instance, result: SolveResultSchema.parse(res.default) }
}

export function mockSolve(req: SolveRequest): RunHandle {
  const listeners: Array<(p: RunProgress) => void> = []
  let cancelled = false
  let timer: ReturnType<typeof setInterval> | undefined
  let rejectRun: ((e: Error) => void) | undefined

  const result = new Promise<SolveResult>((resolve, reject) => {
    rejectRun = reject
    void (async () => {
      if (req.algo !== 'sa') return reject(new Error('Mode simulé : seul le recuit simulé a une solution simulée ; aucun résultat factice n’est produit pour cet algorithme. Branchez le solveur (VITE_API_MODE=http).'))
      if (req.instance.id !== 'NANCY-60') return reject(new Error('Mode simulé : calcul disponible uniquement sur NANCY-60. Branchez le solveur pour les autres instances.'))
      const fx = await fixture()
      if (fingerprint(fx.instance) !== fingerprint(req.instance)) {
        return reject(new Error('Mode simulé : NANCY-60 a été modifiée (clients, dépôt, flotte ou trafic) ; le résultat simulé ne lui correspond plus. Rechargez l’instance ou branchez le solveur.'))
      }
      const { durationS, seed, t0, t1 } = req.params
      const n = req.instance.customers.length
      const meanLeg = fx.result.costInitial / (n + req.instance.fleet.k)
      const T0 = t0 * meanLeg
      const T1 = t1 * meanLeg
      const steps = Math.min(MAX_POINTS, Math.max(1, Math.round(durationS / STEP_S)))
      const rng = mulberry32(seed)
      const start = fx.result.costInitial
      const end = fx.result.cost
      const history: HistoryPoint[] = []
      let best = start
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * durationS
        const temp = T0 * (T1 / T0) ** (t / durationS)
        const trend = end + (start - end) * Math.exp((-4 * t) / durationS)
        // le recuit accepte des solutions moins bonnes : le coût courant oscille AU-DESSUS du meilleur
        const noise = (start - end) * 0.8 * (temp / T0) ** 0.5 * rng()
        const cost = i === steps ? end : Math.max(end, trend + noise)
        best = i === steps ? end : Math.min(best, cost)
        const r1 = (v: number): number => (i === steps ? v : Math.round(v * 10) / 10) // point final = valeurs exactes du résultat
        history.push({ t: Math.round(t * 100) / 100, cost: r1(cost), best: r1(best), temp: Math.round(temp * 1000) / 1000 })
      }

      const t0ms = performance.now()
      let sent = 0
      timer = setInterval(() => {
        if (cancelled) return
        const elapsed = (performance.now() - t0ms) / 1000
        const upto = Math.min(history.length, Math.floor(elapsed / (durationS / steps)) + 1)
        if (upto > sent) {
          sent = upto
          const p = { t: Math.min(elapsed, durationS), history: history.slice(0, upto) }
          listeners.forEach((l) => l(p))
        }
        if (upto >= history.length) {
          clearInterval(timer)
          // contraintes non traitées par l'algorithme + celles que la solution simulée ne respecte pas, si actives
          const active = activeConstraints(req.instance)
          const ignored = new Set([...ignoredBy(req.algo, req.instance), ...fx.result.ignoredConstraints.filter((c) => active.includes(c))])
          resolve({
            ...fx.result,
            history,
            ignoredConstraints: [...ignored],
            message: `${fx.result.message} Algorithme demandé : ${req.algo}.`,
          })
        }
      }, TICK_MS)
    })()
  })

  return {
    onProgress: (cb) => void listeners.push(cb),
    result,
    cancel: () => {
      if (cancelled) return
      cancelled = true
      if (timer) clearInterval(timer)
      rejectRun?.(new RunCancelled())
    },
  }
}
