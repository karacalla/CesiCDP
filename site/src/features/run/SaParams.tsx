/**
 * Rôle : réglages du recuit simulé, mêmes noms et mêmes défauts que `resoudre()` du solveur.
 */
import { Section } from '@/components/ui/Section'
import { MOVE_NAMES } from '@/config/solver'
import { fr } from '@/i18n/fr'
import { useRun } from '@/store/run'

function NumberField({ label, value, step, min, max, disabled, onChange }: { label: string; value: number; step: number; min: number; max: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-panel-ink-2">
      {label}
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)))
        }}
        className="h-9 min-w-0 rounded-xl border border-panel-line bg-panel-surface px-3 text-sm tabular-nums text-panel-ink disabled:opacity-60"
      />
    </label>
  )
}

export function SaParams({ disabled }: { disabled: boolean }) {
  const params = useRun((s) => s.params)
  const setParams = useRun((s) => s.setParams)
  const sum = params.moveProbas.reduce((a, b) => a + b, 0)
  return (
    <Section title={fr.run.params}>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={fr.run.duration} value={params.durationS} step={1} min={1} max={600} disabled={disabled} onChange={(durationS) => setParams({ durationS })} />
        <NumberField label={fr.run.seed} value={params.seed} step={1} min={0} max={99999} disabled={disabled} onChange={(seed) => setParams({ seed: Math.round(seed) })} />
        <NumberField label={fr.run.K} value={params.K} step={1} min={1} max={200} disabled={disabled} onChange={(K) => setParams({ K: Math.round(K) })} />
        <span />
        <NumberField label={fr.run.t0} value={params.t0} step={0.05} min={0.001} max={10} disabled={disabled} onChange={(t0) => setParams({ t0 })} />
        <NumberField label={fr.run.t1} value={params.t1} step={0.005} min={0.0001} max={10} disabled={disabled} onChange={(t1) => setParams({ t1 })} />
      </div>
      <p className="text-xs text-panel-ink-2">{fr.run.tHint}</p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-panel-ink">{fr.run.probas}</legend>
        <div className="grid grid-cols-4 gap-2">
          {MOVE_NAMES.map((name, i) => (
            <NumberField key={name} label={name} value={params.moveProbas[i] ?? 0} step={0.05} min={0} max={1} disabled={disabled} onChange={(v) => setParams({ moveProbas: params.moveProbas.map((p, k) => (k === i ? v : p)) })} />
          ))}
        </div>
        <p className="text-xs text-panel-ink-2">{fr.run.probaSum(sum.toLocaleString('fr-FR', { maximumFractionDigits: 2 }))}</p>
      </fieldset>
    </Section>
  )
}
