/**
 * Rôle : zoom (Ctrl/⌘ + molette, boutons) et déplacement (glisser) du Gantt.
 * Choix retenu (ADR-005) : pendant le geste, l'emprise « en cours » vit dans une ref et seul l'attribut
 *   `transform` du groupe SVG change ; 160 ms après le dernier évènement, l'emprise est validée (un re-rendu).
 * Alternative écartée : état React à chaque évènement (S3 : 167 ms par image pour 20 × 50 arrêts).
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { panDomain, transformBetween, zoomDomain, type Domain } from './ganttScale'

const COMMIT_MS = 160
const DRAG_THRESHOLD_PX = 4

export function useGanttZoom(full: Domain | null, x0: number, x1: number) {
  const [domain, setDomain] = useState<Domain | null>(full)
  const [fullKey, setFullKey] = useState(full)
  if (full !== fullKey) {
    // nouveau résultat : on repart de la journée entière (ajustement pendant le rendu, pas d'effet)
    setFullKey(full)
    setDomain(full)
  }
  const pending = useRef<Domain | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const groupRef = useRef<SVGGElement | null>(null)
  const drag = useRef<{ x: number; start: Domain; moved: boolean } | null>(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const commit = useCallback(() => {
    window.clearTimeout(timer.current)
    if (pending.current) setDomain(pending.current)
    pending.current = null
    groupRef.current?.removeAttribute('transform')
  }, [])

  const preview = useCallback(
    (next: Domain) => {
      if (!domain) return
      pending.current = next
      const { k, tx } = transformBetween(domain, next, x0, x1)
      groupRef.current?.setAttribute('transform', `translate(${tx} 0) scale(${k} 1)`)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(commit, COMMIT_MS)
    },
    [domain, x0, x1, commit],
  )

  const current = (): Domain | null => pending.current ?? domain
  const timeAt = (px: number, d: Domain): number => d[0] + ((px - x0) / (x1 - x0)) * (d[1] - d[0])

  const zoomBy = useCallback(
    (k: number, anchorPx?: number) => {
      const d = pending.current ?? domain
      if (!d || !full) return
      const anchor = anchorPx === undefined ? (d[0] + d[1]) / 2 : d[0] + ((anchorPx - x0) / (x1 - x0)) * (d[1] - d[0])
      preview(zoomDomain(d, full, k, anchor))
    },
    [domain, full, preview, x0, x1],
  )

  const onWheel = useCallback(
    (e: WheelEvent, svgLeft: number) => {
      if (!(e.ctrlKey || e.metaKey)) return // la molette seule fait défiler le panneau
      e.preventDefault()
      zoomBy(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - svgLeft)
    },
    [zoomBy],
  )

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = current()
    if (d && e.button === 0) drag.current = { x: e.clientX, start: d, moved: false }
  }
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = drag.current
    if (!g || !full) return
    const dx = e.clientX - g.x
    if (!g.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return
    if (!g.moved) e.currentTarget.setPointerCapture(e.pointerId)
    g.moved = true
    preview(panDomain(g.start, full, -(dx / (x1 - x0)) * (g.start[1] - g.start[0])))
  }
  /** Renvoie vrai si le geste était un glisser (le clic ne doit alors pas sélectionner d'arrêt). */
  const onPointerUp = (): boolean => {
    const moved = drag.current?.moved ?? false
    drag.current = null
    if (moved) commit()
    return moved
  }

  const reset = useCallback(() => {
    if (full) preview(full)
  }, [full, preview])

  const zoomed = !!(domain && full && (domain[0] !== full[0] || domain[1] !== full[1]))
  return { domain, groupRef, zoomBy, reset, zoomed, onWheel, onPointerDown, onPointerMove, onPointerUp, timeAt }
}
