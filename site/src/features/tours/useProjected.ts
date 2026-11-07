/**
 * Rôle : positionne des éléments HTML sur la carte SANS maplibregl.Marker (ADR-004 : 40 marqueurs MapLibre avec
 *   relief = 10 images/s ; positionnés par notre code = 58 images/s). À chaque rendu de la carte, on projette les
 *   points (`map.project` tient compte du relief) et on écrit directement `transform` : aucun re-rendu React.
 */
import { useEffect, useRef } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { MAP_ID } from '@/features/map/mapId'
import type { LngLat } from '@/lib/route'

export interface Projected {
  lngLat: LngLat
  /** Cap géographique (°) : l'élément est tourné de (cap − orientation de la carte). */
  heading?: number
}

export function useProjected(items: readonly Projected[]) {
  const map = useMap()[MAP_ID]
  const refs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    if (!map) return
    const update = (): void => {
      const mapBearing = map.getBearing()
      items.forEach((it, i) => {
        const el = refs.current[i]
        if (!el) return
        const p = map.project(it.lngLat)
        const rot = it.heading === undefined ? '' : ` rotate(${it.heading - mapBearing}deg)`
        el.style.transform = `translate(${p.x}px, ${p.y}px)${rot}`
        el.dataset.rot = it.heading === undefined ? '' : String(it.heading - mapBearing)
      })
    }
    update()
    map.on('render', update)
    return () => void map.off('render', update)
  }, [map, items])

  return (i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el
  }
}
