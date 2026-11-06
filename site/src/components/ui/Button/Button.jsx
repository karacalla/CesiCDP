import styles from './Button.module.css'

// variant "glass" : bouton rond sur la carte, "light" : bouton texte sur fond clair
export function Button({ variant = 'glass', children, ...props }) {
  return (
    <button type="button" className={`${styles.root} ${styles[variant]}`} {...props}>
      {children}
    </button>
  )
}
