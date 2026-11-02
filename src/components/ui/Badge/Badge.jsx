import { cx } from '../../../lib'
import styles from './Badge.module.css'

/**
 * Pastille de comptage, posée en coin de son parent (qui doit être `relative`).
 * size : sm | md. `inset` la rentre vers l'intérieur. `color` remplace le rose par défaut.
 */
export function Badge({ size = 'sm', inset = false, color, children }) {
  return (
    <span className={cx(styles.root, styles[size], inset && styles.inset)} style={color ? { background: color } : undefined}>
      {children}
    </span>
  )
}
