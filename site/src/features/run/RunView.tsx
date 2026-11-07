/**
 * Rôle : vue « Calcul » : algorithme, réglages, lancement / annulation, progression et convergence en direct.
 */
import { Loader2, Play, Square } from 'lucide-react'
import { Section } from '@/components/ui/Section'
import { fr } from '@/i18n/fr'
import { api } from '@/services/api'
import { useRun } from '@/store/run'
import { useUi } from '@/store/ui'
import { useVrp } from '@/store/vrp'
import { AlgoPicker } from './AlgoPicker'
import { ConvergenceCharts } from './ConvergenceCharts'
import { SaParams } from './SaParams'

const fmt = (v: number, d = 1): string => v.toLocaleString('fr-FR', { maximumFractionDigits: d })

export function RunView() {
  const instance = useVrp((s) => s.instance)
  const { algo, params, status, elapsed, history, result, error, start, cancel } = useRun()
  const setView = useUi((s) => s.setView)
  if (!instance) return null
  const running = status === 'running'
  const pct = Math.round((100 * Math.min(elapsed, params.durationS)) / params.durationS)

  return (
    <div className="flex flex-col gap-4">
      <AlgoPicker instance={instance} disabled={running} />
      {algo === 'sa' && <SaParams disabled={running} />}
      <Section title={fr.run.convergence}>
        <div className="flex flex-wrap items-center gap-3">
          {running ? (
            <button type="button" onClick={cancel} className="inline-flex h-10 items-center gap-2 rounded-full border border-panel-ink bg-panel-surface px-4 text-sm font-semibold text-panel-ink">
              <Square size={16} aria-hidden /> {fr.run.cancel}
            </button>
          ) : (
            <button type="button" onClick={() => start(instance)} className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover">
              <Play size={16} aria-hidden /> {fr.run.launch}
            </button>
          )}
          {running && <Loader2 size={18} aria-hidden className="animate-spin text-panel-ink-2" />}
        </div>
        <div role="progressbar" aria-label={fr.run.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 overflow-hidden rounded-full bg-panel">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${status === 'done' ? 100 : pct}%` }} />
        </div>
        <p aria-live="polite" className="text-sm text-panel-ink">
          {status === 'running' ? fr.run.status.running(fmt(elapsed), fmt(params.durationS, 0)) : fr.run.status[status]}
        </p>
        {error && <p className="text-sm text-panel-ink"><span aria-hidden className="mr-1 font-bold text-panel-late">!</span>{error}</p>}
        {api.mode === 'mock' && history.length > 0 && <p className="text-xs text-panel-ink-2">{fr.run.simulatedCurve}</p>}
        {history.length > 0 ? <ConvergenceCharts history={history} durationS={params.durationS} /> : <p className="text-xs text-panel-ink-2">{fr.run.noData}</p>}
        {result && status === 'done' && (
          <div className="flex flex-col gap-2 rounded-2xl border border-panel-line p-3 text-sm text-panel-ink">
            <p>{fr.run.summary(fmt(result.cost), fmt(result.costInitial), `${fmt((100 * (result.cost - result.costInitial)) / result.costInitial)} %`)}</p>
            <p className="text-xs text-panel-ink-2">{fr.run.objective} : {result.objective}</p>
            {result.ignoredConstraints.length > 0 && (
              <p className="text-xs"><span aria-hidden className="mr-1 font-bold text-panel-late">!</span>{fr.run.ignoredTitle} : {result.ignoredConstraints.map((c) => fr.run.caps[c]).join(', ')}.</p>
            )}
            <button type="button" onClick={() => setView('results')} className="self-start text-sm font-semibold text-panel-accent-ink underline underline-offset-4">{fr.run.seeResults}</button>
          </div>
        )}
      </Section>
    </div>
  )
}
