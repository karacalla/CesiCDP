/**
 * Rôle : évènements du camion du panneau venus d'ailleurs : « Rejouer l'animation » (réglages) et début / fin de
 *   simulation (T2 / T3, émis par la simulation de P5). Un `EventTarget` du navigateur, sans état global.
 */
const bus = new EventTarget()

export type CameoEvent = 'replay' | 'simulation-start' | 'simulation-end'

export function emitCameo(type: CameoEvent): void {
  bus.dispatchEvent(new Event(type))
}

/** À appeler par la simulation (P5) : `true` au départ, `false` à la fin ou à l'arrêt. */
export function notifySimulation(running: boolean): void {
  emitCameo(running ? 'simulation-start' : 'simulation-end')
}

export function onCameo(type: CameoEvent, fn: () => void): () => void {
  bus.addEventListener(type, fn)
  return () => bus.removeEventListener(type, fn)
}
