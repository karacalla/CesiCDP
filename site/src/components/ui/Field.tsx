/**
 * Rôle : champ de formulaire étiqueté, avec message d'erreur relié (`aria-describedby`, `aria-invalid`).
 * Le champ garde la saisie en cours ; la validation et l'enregistrement se font à la sortie du champ.
 */
import { useId, type InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string | null
}

export function Field({ label, error, className = '', ...rest }: Props) {
  const id = useId()
  const errId = `${id}-err`
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-panel-ink-2">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={`h-9 min-w-0 rounded-xl border bg-panel-surface px-3 text-sm text-panel-ink disabled:cursor-not-allowed disabled:opacity-60 ${error ? 'border-panel-late' : 'border-panel-line'}`}
        {...rest}
      />
      {error && (
        <p id={errId} className="text-xs text-panel-ink">
          <span aria-hidden className="mr-1 font-bold text-panel-late">!</span>
          {error}
        </p>
      )}
    </div>
  )
}
