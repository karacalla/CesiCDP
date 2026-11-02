import { cx } from '../../../lib'
import styles from './Button.module.css'

/**
 * Bouton rond : icône seule (size sm | md | lg, avec `aria-label`) ou libellé (size="text").
 * variant : glass | light | ghost. `active` met le bouton en évidence.
 * `className` sert uniquement à la mise en page.
 */
export function Button({ variant = 'glass', size = 'md', active = false, className, children, ...props }) {
  return (
    <button
      type="button"
      className={cx(styles.root, styles[size], styles[variant], active && styles.active, className)}
      {...props}
    >
      {children}
    </button>
  )
}
