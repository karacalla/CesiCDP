import styles from './Card.module.css'

// fond blanc arrondi (utilisé par StatTile)
export function Card({ children }) {
  return <div className={styles.root}>{children}</div>
}
