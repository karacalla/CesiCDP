/**
 * Rôle : colonne d'outils de la carte (réinitialiser, zoomer, dézoomer, centrer sur le dépôt), en bas à droite.
 * Les mouvements de caméra sont instantanés si l'utilisateur a demandé moins d'animations.
 */
import { LocateFixed, Minus, Plus, RotateCw } from 'lucide-react'
import { useMap } from 'react-map-gl/maplibre'
import { IconButton } from '@/components/ui/IconButton'
import { CAMERA_MS, DEPOT_FOCUS, INITIAL_VIEW, type CameraView } from '@/config/app'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { fr } from '@/i18n/fr'
import { MAP_ID } from './mapId'

function toCamera(v: CameraView) {
  return { center: [v.longitude, v.latitude] as [number, number], zoom: v.zoom, pitch: v.pitch, bearing: v.bearing }
}

export function MapToolbar({ className = '' }: { className?: string }) {
  const map = useMap()[MAP_ID]
  const reduced = usePrefersReducedMotion()
  const duration = reduced ? 0 : CAMERA_MS
  const icon = { size: 18, 'aria-hidden': true } as const

  return (
    <div role="toolbar" aria-label={fr.map.tools} aria-orientation="vertical" className={`flex flex-col gap-2 ${className}`}>
      <IconButton label={fr.map.reset} icon={<RotateCw {...icon} />} onClick={() => map?.flyTo({ ...toCamera(INITIAL_VIEW), duration })} />
      <IconButton label={fr.map.zoomIn} icon={<Plus {...icon} />} onClick={() => map?.zoomIn({ duration: reduced ? 0 : 300 })} />
      <IconButton label={fr.map.zoomOut} icon={<Minus {...icon} />} onClick={() => map?.zoomOut({ duration: reduced ? 0 : 300 })} />
      <IconButton label={fr.map.locate} icon={<LocateFixed {...icon} />} onClick={() => map?.flyTo({ ...toCamera(DEPOT_FOCUS), duration })} />
    </div>
  )
}
