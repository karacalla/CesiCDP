/**
 * Rôle : cadrages de la scène d'ouverture : vue globe (rayon voulu dans la zone visible) et emprise des tournées
 *   calculée en Mercator (S4 : `cameraForBounds` sur le globe rend un zoom faux, 7,7 au lieu de 10,7).
 */
import { fitBounds } from '@math.gl/web-mercator'
import { GLOBE } from '@/config/globe'
import { NO_INSETS, visiblePadding } from '@/lib/cameraPadding'
import type { Instance } from '@/types/vrp'
import { globeZoom } from './globeData'

export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export function globeCamera(container: HTMLElement) {
  const pad = visiblePadding(container)
  const zoom = globeZoom(container.clientWidth - pad.left - pad.right, container.clientHeight - pad.top - pad.bottom, GLOBE.radiusShare)
  return { center: GLOBE.center, zoom, pitch: 0, bearing: 0, padding: pad }
}

/** Caméra Mercator qui montre dépôt et clients dans la zone visible (marges de 80 px autour). */
export function instanceCamera(container: HTMLElement, instance: Instance) {
  let [w, s, e, n] = [instance.depot.lng, instance.depot.lat, instance.depot.lng, instance.depot.lat]
  for (const c of instance.customers) {
    w = Math.min(w, c.lng); e = Math.max(e, c.lng); s = Math.min(s, c.lat); n = Math.max(n, c.lat)
  }
  const pad = visiblePadding(container, { top: 80, right: 80, bottom: 80, left: 80 })
  const fit = fitBounds({ width: container.clientWidth, height: container.clientHeight, bounds: [[w, s], [e, n]], padding: pad, maxZoom: 13 })
  return { center: [fit.longitude, fit.latitude] as [number, number], zoom: fit.zoom, pitch: 0, bearing: 0, padding: NO_INSETS }
}
