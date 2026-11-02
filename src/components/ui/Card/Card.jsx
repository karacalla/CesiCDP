import { cx } from '../../../lib'
import styles from './Card.module.css'

/** Surface blanche arrondie. `padded` ajoute le padding standard. */
export function Card({ padded = false, className, children }) {
  return <div className={cx(styles.root, padded && styles.padded, className)}>{children}</div>
}
