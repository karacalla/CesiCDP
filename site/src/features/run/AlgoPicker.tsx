/**
 * Rôle : choix de l'algorithme, avec ce qu'il traite (fenêtres, trafic) affiché en icône + libellé, et l'alerte
 *   « non pris en compte » pour toute contrainte ACTIVE qu'il ignore (critère P3).
 */
import { AlertTriangle, Check, X } from 'lucide-react'
import { Section } from '@/components/ui/Section'
import { ALGOS } from '@/config/solver'
import { fr } from '@/i18n/fr'
import { ignoredBy } from '@/lib/constraints'
import { useRun } from '@/store/run'
import type { Instance } from '@/types/vrp'

export function AlgoPicker({ instance, disabled }: { instance: Instance; disabled: boolean }) {
  const algo = useRun((s) => s.algo)
  const setAlgo = useRun((s) => s.setAlgo)
  const ignored = ignoredBy(algo, instance)

  return (
    <Section title={fr.run.algo}>
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="sr-only">{fr.run.algo}</legend>
        {ALGOS.map((a) => (
          <label key={a.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${algo === a.id ? 'border-panel-ink bg-panel' : 'border-panel-line'}`}>
            <input type="radio" name="algo" value={a.id} checked={algo === a.id} onChange={() => setAlgo(a.id)} className="mt-1 accent-[var(--accent)]" />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-semibold text-panel-ink">{a.label}</span>
              <span className="text-xs text-panel-ink-2">{a.description}</span>
              <span className="flex flex-wrap gap-3 text-xs">
                {(['timeWindows', 'traffic'] as const).map((k) => (
                  <span key={k} className={`inline-flex items-center gap-1 ${a.capabilities[k] ? 'text-panel-ok' : 'text-panel-ink-2'}`}>
                    {a.capabilities[k] ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
                    {fr.run.caps[k]} : {a.capabilities[k] ? fr.run.handled : fr.run.notHandled}
                  </span>
                ))}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {ignored.length > 0 && (
        <div role="status" className="flex gap-3 rounded-2xl border border-panel-late p-3">
          <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0 text-panel-late" />
          <div className="text-xs text-panel-ink">
            <p className="text-sm font-semibold">{fr.run.ignoredTitle}</p>
            <p>{fr.run.ignoredBody(ignored.map((c) => `${fr.run.caps[c]} : ${fr.run.notHandled}`).join(' ; '))}</p>
          </div>
        </div>
      )}
    </Section>
  )
}
