/**
 * Rôle : machine d'états du camion du panneau (ADR-022), pure et testable (horloge et lecteur injectés).
 *   États : `home` (au dépôt, dans sa baie) · `leaving` · `away` (en tournée) · `entering`.
 *   Déclencheurs : T1 changement de camion (l'ancien sort, le nouveau entre) ; T2 / T3 début / fin de simulation ;
 *   T4 première apparition des tournées (entrée depuis le coin) ; T5 passage de démonstration (inactivité).
 * Choix retenu : FILE d'étapes jouées une à une (jamais deux animations en même temps) ; le rendu (WAAPI) est
 *   fourni par `play`, qui appelle `done` à la fin — ou tout de suite si les animations sont désactivées.
 * Question probable du jury : « et si l'on clique trois camions de suite ? » → les étapes s'enchaînent dans l'ordre,
 *   les intermédiaires inutiles sont fusionnés (seul le dernier camion entre).
 */
import { CAMEO } from '@/config/cameo'

export type CameoState = 'home' | 'leaving' | 'away' | 'entering'
type Step = { kind: 'exit' } | { kind: 'enter'; vehicleId: number } | { kind: 'wait'; ms: number }

export interface CameoSnapshot {
  state: CameoState
  /** Camion dessiné dans la baie (ou attendu). */
  vehicleId: number | null
}

export interface CameoDeps {
  now: () => number
  setTimer: (fn: () => void, ms: number) => () => void
  /** Joue une sortie ou une entrée ; appelle `done` à la fin ; renvoie une fonction d'annulation. */
  play: (kind: 'exit' | 'enter', vehicleId: number, done: () => void) => () => void
  onChange: (s: CameoSnapshot) => void
}

export interface IdleContext {
  /** Calcul ou simulation en cours : jamais de passage de démonstration. */
  busy: boolean
  hidden: boolean
  /** Le passage T5 n'existe qu'avec les animations complètes. */
  full: boolean
}

export class CameoMachine {
  private state: CameoState = 'home'
  private vehicleId: number | null = null
  private queue: Step[] = []
  private cancel: (() => void) | null = null
  private lastActivity: number
  private lastDemo = -Infinity
  private firstRoutesDone = false
  private config: typeof CAMEO

  constructor(private deps: CameoDeps, config: Partial<typeof CAMEO> = {}) {
    this.config = { ...CAMEO, ...config }
    this.lastActivity = deps.now()
  }

  snapshot(): CameoSnapshot {
    return { state: this.state, vehicleId: this.vehicleId }
  }

  /** T1 : changement de camion sélectionné. */
  select(vehicleId: number): void {
    const target = this.lastQueuedVehicle()
    if (target === vehicleId) return
    if (this.vehicleId === null && !this.cancel && this.queue.length === 0) {
      this.vehicleId = vehicleId // premier camion : rien à faire sortir
      this.emit()
      return
    }
    // on remplace une entrée encore en attente plutôt que d'empiler (clics rapides)
    const pending = this.queue.findIndex((s) => s.kind === 'enter')
    if (pending >= 0) this.queue[pending] = { kind: 'enter', vehicleId }
    else {
      if (this.state === 'home' || this.state === 'entering') this.queue.push({ kind: 'exit' })
      this.queue.push({ kind: 'enter', vehicleId })
    }
    this.pump()
  }

  /** T2 : début de simulation, le camion quitte le dépôt et reste en tournée. */
  simulationStart(): void {
    if (this.state === 'away' || this.state === 'leaving') return
    this.queue = this.queue.filter((s) => s.kind !== 'enter')
    this.queue.push({ kind: 'exit' })
    this.pump()
  }

  /** T3 : fin ou arrêt de la simulation, retour. */
  simulationEnd(): void {
    if (this.vehicleId === null) return
    this.queue.push({ kind: 'enter', vehicleId: this.vehicleId })
    this.pump()
  }

  /** T4 : premières tournées calculées : le camion entre une fois depuis le coin. */
  firstRoutes(vehicleId: number): void {
    if (this.firstRoutesDone) return this.select(vehicleId)
    this.firstRoutesDone = true
    this.state = 'away'
    this.vehicleId = vehicleId
    this.queue.push({ kind: 'enter', vehicleId })
    this.pump()
  }

  activity(): void {
    this.lastActivity = this.deps.now()
  }

  /** T5 : appelé périodiquement ; lance au plus un passage de démonstration par période de repos. */
  checkIdle(ctx: IdleContext): boolean {
    const now = this.deps.now()
    if (!ctx.full || ctx.busy || ctx.hidden || this.state !== 'home' || this.cancel || this.queue.length) return false
    if (now - this.lastActivity < this.config.idleMs || now - this.lastDemo < this.config.demoCooldownMs) return false
    this.demo()
    return true
  }

  /** « Rejouer l'animation » (réglages, jour de la soutenance) : passage de démonstration immédiat. */
  replay(): void {
    if (this.state !== 'home' || this.cancel || this.queue.length || this.vehicleId === null) return
    this.demo()
  }

  dispose(): void {
    this.cancel?.()
    this.cancel = null
    this.queue = []
  }

  private demo(): void {
    if (this.vehicleId === null) return
    this.lastDemo = this.deps.now()
    this.queue.push({ kind: 'exit' }, { kind: 'wait', ms: this.config.demoAbsentMs }, { kind: 'enter', vehicleId: this.vehicleId })
    this.pump()
  }

  private lastQueuedVehicle(): number | null {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const s = this.queue[i]
      if (s?.kind === 'enter') return s.vehicleId
    }
    return this.vehicleId
  }

  private pump(): void {
    if (this.cancel) return
    const step = this.queue.shift()
    if (!step) return
    if (step.kind === 'wait') {
      this.cancel = this.deps.setTimer(() => this.next(), step.ms)
      return
    }
    if (step.kind === 'exit') {
      if (this.state === 'away' || this.vehicleId === null) return this.pump()
      this.state = 'leaving'
      this.emit()
      this.cancel = this.deps.play('exit', this.vehicleId, () => {
        this.state = 'away'
        this.next()
      })
      return
    }
    this.vehicleId = step.vehicleId
    this.state = 'entering'
    this.emit()
    this.cancel = this.deps.play('enter', step.vehicleId, () => {
      this.state = 'home'
      this.next()
    })
  }

  private next(): void {
    this.cancel = null
    this.emit()
    this.pump()
  }

  private emit(): void {
    this.deps.onChange(this.snapshot())
  }
}
