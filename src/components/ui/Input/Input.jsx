import { cx } from '../../../lib'
import styles from './Input.module.css'

/**
 * Champ arrondi avec icône optionnelle. `label` sert d'aria-label ;
 * `className` s'applique au conteneur (mise en page).
 */
export function Input({ icon: Icon, label, className, ...props }) {
  return (
    <label className={cx(styles.root, className)}>
      {Icon && <Icon size={15} className={styles.icon} />}
      <input aria-label={label} className={styles.field} {...props} />
    </label>
  )
}
