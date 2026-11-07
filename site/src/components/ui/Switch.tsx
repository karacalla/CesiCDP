/**
 * Rôle : interrupteur accessible (`role="switch"`, `aria-checked`, libellé et description reliés).
 * Choix retenu : bouton natif (clavier : Espace / Entrée gratuits) plutôt qu'une dépendance Radix pour un seul composant.
 */
import { useId } from 'react'

interface Props {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}

export function Switch({ label, description, checked, disabled, onChange }: Props) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={`${id}-l`} className="text-sm font-semibold text-panel-ink">{label}</p>
        {description && <p id={`${id}-d`} className="mt-0.5 text-xs text-panel-ink-2">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
          checked ? 'border-accent bg-accent' : 'border-panel-ink-2 bg-panel'
        }`}
      >
        <span aria-hidden className={`inline-block size-4 rounded-full transition-transform ${checked ? 'translate-x-6 bg-on-accent' : 'translate-x-1 bg-panel-ink-2'}`} />
      </button>
    </div>
  )
}
