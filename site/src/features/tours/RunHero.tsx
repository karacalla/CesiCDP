/**
 * Rôle : l'action principale en UN clic : « Calculer les tournées », avec ce qu'il faut savoir avant (instance,
 *   contraintes actives, ce que l'algorithme ne prend pas en compte) et la progression sur place. Les réglages fins
 *   restent dans la vue Calcul (« Réglages avancés »).
 * Effet visuel unique de l'application : bordure lumineuse ambre pendant le calcul (Magic UI, ADR-015), absente si
 *   l'utilisateur demande moins d'animations.
 */
import { AlertTriangle, Loader2, Play, RotateCcw, Square } from 'lucide-react'
import { BorderBeam } from '@/components/fx/border-beam'
import { ALGOS } from '@/config/solver'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { fr } from '@/i18n/fr'
import { activeConstraints, ignoredBy } from '@/lib/constraints'
import { useRun } from '@/store/run'
import { useUi } from '@/store/ui'
import { useVrp } from '@/store/vrp'
import type { Instance } from '@/types/vrp'

const fmt = (v: number): string => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })

export function RunHero({ instance, compact }: { instance: Instance; compact: boolean }) {
  const { algo, params, status, elapsed, error, start, cancel } = useRun()
  const setView = useUi((s) => s.setView)
  const reduced = useMotionLevel() !== 'full'
  const load = useVrp((s) => s.load)
  const running = status === 'running'
  const active = activeConstraints(instance)
  const ignored = ignoredBy(algo, instance)
  const algoLabel = ALGOS.find((a) => a.id === algo)?.label ?? algo
  const pct = Math.round((100 * Math.min(elapsed, params.durationS)) / params.durationS)
  const chips = [
    active.includes('timeWindows') ? fr.tours.tw : null,
    active.includes('traffic') ? fr.tours.traffic(instance.traffic.slots.length) : null,
  ].filter(Boolean)

  return (
    <section aria-labelledby="run-hero-title" className="relative flex flex-col gap-3 overflow-hidden rounded-card bg-panel-surface p-5 shadow-[0_18px_40px_-28px_rgb(2_6_23/0.5)]">
      {running && !reduced && <BorderBeam size={90} duration={5} borderWidth={2} colorFrom="#f59e0b" colorTo="#fbbf24" />}
      {!compact && (
        <>
          <p className="text-sm font-light text-panel-ink-2">{fr.tours.empty} · {fr.tours.ready.toLowerCase()}</p>
          <h2 id="run-hero-title" className="text-xl font-semibold text-panel-ink">{instance.name}</h2>
          <p className="text-xs text-panel-ink-2">
            {fr.tours.activeConstraints} : {chips.length ? chips.join(' · ') : fr.tours.none}
          </p>
          {ignored.length > 0 && (
            <p className="flex gap-2 text-xs text-panel-ink">
              <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0 text-panel-late" />
              {fr.tours.algoNote(algoLabel, ignored.map((c) => fr.run.caps[c].toLowerCase()).join(' et '))}
            </p>
          )}
        </>
      )}
      {compact && <h2 id="run-hero-title" className="sr-only">{fr.tours.cta}</h2>}
      <div className="flex flex-wrap items-center gap-3">
        {running ? (
          <button type="button" onClick={cancel} className="inline-flex h-11 items-center gap-2 rounded-full border border-panel-ink px-5 text-sm font-semibold text-panel-ink">
            <Square size={16} aria-hidden /> {fr.run.cancel}
          </button>
        ) : (
          <button type="button" onClick={() => start(instance)} className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent shadow-[0_10px_24px_-12px_rgb(245_158_11/0.9)] hover:bg-accent-hover">
            <Play size={16} aria-hidden className="fill-on-accent" /> {compact ? fr.tours.recompute : fr.tours.cta}
          </button>
        )}
        {!compact && !running && (
          <button type="button" onClick={() => void load('NANCY-60')} className="inline-flex h-11 items-center gap-2 rounded-full border border-panel-line px-4 text-sm font-semibold text-panel-ink hover:border-panel-ink-2">
            <RotateCcw size={16} aria-hidden /> {fr.tours.loadDemo}
          </button>
        )}
        <button type="button" onClick={() => setView('run')} className="text-sm font-semibold text-panel-accent-ink underline-offset-4 hover:underline">
          {fr.tours.advanced}
        </button>
        {running && <Loader2 size={18} aria-hidden className="animate-spin text-panel-ink-2" />}
      </div>
      {running && (
        <>
          <div role="progressbar" aria-label={fr.run.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-1.5 overflow-hidden rounded-full bg-panel">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <p aria-live="polite" className="text-xs text-panel-ink-2">{fr.tours.running(fmt(elapsed), fmt(params.durationS))}</p>
        </>
      )}
      {status === 'cancelled' && <p aria-live="polite" className="text-xs text-panel-ink-2">{fr.run.status.cancelled}</p>}
      {error && (
        <p role="alert" className="text-xs text-panel-ink"><span aria-hidden className="mr-1 font-bold text-panel-late">!</span>{error}</p>
      )}
    </section>
  )
}
