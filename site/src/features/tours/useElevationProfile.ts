/**
 * Rôle : profil d'altitude d'un tracé, lu dans le relief déjà chargé par la carte (`queryTerrainElevation`,
 *   divisé par l'exagération pour revenir aux mètres réels). Aucune requête supplémentaire.
 */
import { useEffect, useState } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { BASEMAP } from '@/config/basemap'
import { MAP_ID } from '@/features/map/mapId'
import type { RouteTrack } from '@/lib/route'

const SAMPLES = 40

export function useElevationProfile(track: RouteTrack | null): number[] | null {
  const map = useMap()[MAP_ID]
  const [profile, setProfile] = useState<number[] | null>(null)
  useEffect(() => {
    if (!map || !track) return
    let cancelled = false
    const sample = (): void => {
      if (cancelled) return
      const total = track.cum.at(-1) ?? 0
      const out: number[] = []
      let j = 0
      for (let k = 0; k < SAMPLES; k++) {
        const d = (k / (SAMPLES - 1)) * total
        while (j < track.cum.length - 1 && (track.cum[j + 1] ?? 0) < d) j++
        const p = track.coords[j]
        const z = p ? map.queryTerrainElevation(p) : null
        // relief pas encore chargé à cet endroit : on reprend la valeur précédente (≥ 60 % de points réels exigés)
        out.push(z === null || z === undefined ? Number.NaN : z / BASEMAP.exaggeration)
      }
      const known = out.filter((v) => Number.isFinite(v))
      if (known.length < SAMPLES * 0.6) return setProfile(null)
      let last = known[0] ?? 0
      setProfile(out.map((v) => (Number.isFinite(v) ? (last = v) : last)))
    }
    map.once('idle', sample)
    map.triggerRepaint()
    return () => {
      cancelled = true
      map.off('idle', sample)
    }
  }, [map, track])
  return track ? profile : null
}
