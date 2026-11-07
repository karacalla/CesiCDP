/**
 * Rôle : brouillon de formulaire (chaînes saisies) + erreurs par champ ; validation et enregistrement à la sortie
 *   d'un champ. La valeur enregistrée n'est jamais invalide.
 */
import { useCallback, useState } from 'react'

export type Draft<K extends string> = Record<K, string>

export function useDraft<K extends string>(initial: Draft<K>, commit: (d: Draft<K>) => Partial<Record<K, string>>) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({})
  const field = useCallback(
    (key: K) => ({
      value: draft[key],
      error: errors[key] ?? null,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [key]: e.target.value })),
      onBlur: () => setErrors(commit(draft)),
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') setErrors(commit(draft))
      },
    }),
    [draft, errors, commit],
  )
  return { field }
}
