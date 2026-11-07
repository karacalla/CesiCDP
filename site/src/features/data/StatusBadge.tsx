/**
 * Rôle : statut de fenêtre d'un client, toujours en icône + libellé (jamais la couleur seule, CLAUDE.md §4).
 */
import { AlertTriangle, CheckCircle2, CircleDashed } from 'lucide-react'
import { fr } from '@/i18n/fr'
import type { TwStatus } from '@/lib/validation'

const STYLE: Record<TwStatus, { icon: typeof CheckCircle2; cls: string }> = {
  ok: { icon: CheckCircle2, cls: 'text-panel-ok' },
  none: { icon: CircleDashed, cls: 'text-panel-ink-2' },
  invalid: { icon: AlertTriangle, cls: 'text-panel-late' },
}

export function StatusBadge({ status }: { status: TwStatus }) {
  const { icon: Icon, cls } = STYLE[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 text-xs font-medium ${cls}`}>
      <Icon size={14} aria-hidden />
      {fr.data.twStatus[status]}
    </span>
  )
}
