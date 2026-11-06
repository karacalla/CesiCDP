import { Maximize2, Minus, Plus } from 'lucide-react'
import { Button } from '../../components/ui'
import styles from './MapControls.module.css'

// boutons à gauche de la carte : tout voir et zoom
export function MapControls({ onShowAll, onZoomIn, onZoomOut }) {
  return (
    <div className={styles.root}>
      <Button title="Voir toute la France" onClick={onShowAll}><Maximize2 size={16} /></Button>
      <Button title="Zoom avant" onClick={onZoomIn}><Plus size={16} /></Button>
      <Button title="Zoom arrière" onClick={onZoomOut}><Minus size={16} /></Button>
    </div>
  )
}
