/**
 * Rôle : cellule éditable de la table clients. La saisie reste locale ; Entrée ou sortie du champ = validation
 *   (via le store, qui refuse toute valeur invalide), Échap = annulation. Le message d'erreur est relié au champ.
 */
import { memo, useEffect, useId, useState } from 'react'
import type { FieldError } from '@/lib/validation'

interface Props {
  value: string
  label: string
  align?: 'left' | 'right'
  onCommit: (text: string) => FieldError[]
}

export const EditableCell = memo(function EditableCell({ value, label, align = 'right', onCommit }: Props) {
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const errId = useId()
  useEffect(() => setDraft(value), [value])

  const commit = (): void => {
    if (draft === value) return setError(null)
    const errors = onCommit(draft)
    setError(errors.length ? errors.map((e) => e.message).join(' ; ') : null)
  }

  return (
    <span className="relative block">
      <input
        value={draft}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        title={error ?? undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(value)
            setError(null)
          }
        }}
        className={`h-8 w-full min-w-0 rounded-lg border bg-transparent px-2 text-sm text-panel-ink tabular-nums hover:border-panel-line focus:bg-panel-surface ${
          align === 'right' ? 'text-right' : 'text-left'
        } ${error ? 'border-panel-late' : 'border-transparent'}`}
      />
      {error && (
        <span id={errId} role="alert" className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg bg-ink px-2 py-1 text-xs text-on-dark shadow-lg">
          {error}
        </span>
      )}
    </span>
  )
})
