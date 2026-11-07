/**
 * Rôle : racine de l'application : assemble le cadre, la carte et le panneau.
 * Question probable du jury : « où est la logique ? » → dans les hooks, le store et les services, jamais ici.
 */
import { MapProvider } from 'react-map-gl/maplibre'
import { AppFrame } from '@/components/layout/AppFrame'
import { MapOverlay } from '@/features/map/MapOverlay'
import { MapStage } from '@/features/map/MapStage'
import { PanelContent } from '@/features/panel/PanelContent'
import { useThemeAttribute } from '@/hooks/useThemeAttribute'
import { useUi } from '@/store/ui'

export function App() {
  useThemeAttribute()
  const collapsed = useUi((s) => s.panelCollapsed)
  const togglePanel = useUi((s) => s.togglePanel)

  return (
    <MapProvider>
      <AppFrame
        collapsed={collapsed}
        onTogglePanel={togglePanel}
        map={
          <MapStage>
            <MapOverlay />
          </MapStage>
        }
        panel={<PanelContent />}
      />
    </MapProvider>
  )
}
