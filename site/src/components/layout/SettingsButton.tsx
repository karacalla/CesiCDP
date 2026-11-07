/**
 * Rôle : réglages d'affichage : niveau d'animation (complètes / réduites / aucune), mémorisé localement.
 *   Par défaut, le niveau suit la préférence système « réduire les animations ».
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Settings2 } from 'lucide-react'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { fr } from '@/i18n/fr'
import { useUi, type MotionLevel } from '@/store/ui'

const LEVELS: MotionLevel[] = ['full', 'reduced', 'none']

export function SettingsButton({ extra }: { extra?: ReactNode }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const level = useMotionLevel()
  const setMotionPref = useUi((s) => s.setMotionPref)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => void (e.key === 'Escape' && setOpen(false))
    const onDown = (e: MouseEvent): void => void (!ref.current?.contains(e.target as Node) && setOpen(false))
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={fr.settings.label}
        title={fr.settings.label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="grid size-10 place-items-center rounded-full border border-panel-line bg-panel-surface text-panel-ink hover:border-panel-ink-2"
      >
        <Settings2 size={18} aria-hidden />
      </button>
      {open && (
        <div id={id} role="region" aria-label={fr.settings.label} className="absolute right-0 top-12 z-30 flex w-64 flex-col gap-3 rounded-2xl border border-panel-line bg-panel-surface p-3 shadow-[var(--shadow-float)]">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-semibold text-panel-ink">{fr.settings.animations}</legend>
            {LEVELS.map((l) => (
              <label key={l} className="flex items-center gap-2 text-sm text-panel-ink">
                <input type="radio" name={`${id}-motion`} value={l} checked={level === l} onChange={() => setMotionPref(l)} className="accent-[var(--accent)]" />
                {fr.settings.levels[l]}
              </label>
            ))}
          </fieldset>
          {extra}
        </div>
      )}
    </div>
  )
}
