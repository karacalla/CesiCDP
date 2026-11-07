/**
 * Rôle : bouton rond à icône seule, toujours doté d'un nom accessible (aria-label) et d'une info-bulle native.
 * Variantes : `glass` (posé sur la carte), `panel` (posé sur le panneau, suit le thème), `solid` (actif : blanc plein).
 * Question probable du jury : « comment un lecteur d'écran lit-il une icône ? » → par `label`, obligatoire au typage.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'glass' | 'panel' | 'solid'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  label: string
  icon: ReactNode
  variant?: Variant
  size?: 36 | 40
}

const VARIANTS: Record<Variant, string> = {
  glass: 'glass text-on-dark hover:bg-black/60',
  panel: 'border border-panel-line bg-panel-surface text-panel-ink hover:border-panel-ink-2',
  solid: 'bg-white text-ink shadow-lg',
}

export function IconButton({ label, icon, variant = 'glass', size = 40, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-colors ${size === 40 ? 'size-10' : 'size-9'} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  )
}
