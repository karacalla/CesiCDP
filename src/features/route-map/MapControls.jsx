import { Minus, Plus, RotateCw } from 'lucide-react'
import { Button } from '../../components/ui'
import styles from './MapControls.module.css'

/** Boutons flottants : orbite automatique et zoom. */
export function MapControls({ orbit, onToggleOrbit, onZoomIn, onZoomOut }) {
  return (
    <div className={styles.root}>
      <Button active={orbit} aria-label={orbit ? 'Arrêter l’orbite' : 'Lancer l’orbite'} onClick={onToggleOrbit}><RotateCw size={16} /></Button>
      <Button aria-label="Zoom avant" onClick={onZoomIn}><Plus size={16} /></Button>
      <Button aria-label="Zoom arrière" onClick={onZoomOut}><Minus size={16} /></Button>
    </div>
  )
}
