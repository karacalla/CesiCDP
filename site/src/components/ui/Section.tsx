/**
 * Rôle : carte de section du panneau, avec un titre de niveau 2 (structure de titres pour les lecteurs d'écran).
 */
import { useId, type ReactNode } from 'react'

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-card border border-panel-line bg-panel-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-base font-semibold text-panel-ink">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
