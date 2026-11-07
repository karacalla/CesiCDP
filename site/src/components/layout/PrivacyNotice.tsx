/**
 * Rôle : mention RGPD toujours visible (traitement local, ce que révèlent les tuiles de carte).
 */
import { ShieldCheck } from 'lucide-react'
import { fr } from '@/i18n/fr'

export function PrivacyNotice() {
  return (
    <aside aria-label={fr.privacy.title} className="flex gap-3 rounded-2xl border border-panel-line bg-panel-surface p-3">
      <ShieldCheck size={18} aria-hidden className="mt-0.5 shrink-0 text-panel-accent-ink" />
      <p className="text-xs leading-relaxed text-panel-ink-2">
        <strong className="font-semibold text-panel-ink">{fr.privacy.title}. </strong>
        {fr.privacy.body}
      </p>
    </aside>
  )
}
