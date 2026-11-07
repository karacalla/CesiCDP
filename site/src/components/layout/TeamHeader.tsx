/**
 * Rôle : membres du groupe dans l'en-tête (exigence E1), lus depuis config/team.ts, en UNE ligne compacte :
 *   pastilles d'initiales superposées + liste des noms. Aucune image tierce (RGPD), aucun nom inventé.
 */
import { TEAM, TEAM_NAME } from '@/config/team'
import { fr } from '@/i18n/fr'
import { teamView } from '@/lib/team'

const MEMBERS = teamView(TEAM)

export function TeamHeader() {
  return (
    <section aria-label={`${TEAM_NAME} — ${fr.team.label}`} className="flex min-w-0 items-center gap-3">
      <span aria-hidden className="flex shrink-0 -space-x-2">
        {MEMBERS.map((m) => (
          <span key={m.key} className={`grid size-7 place-items-center rounded-full text-xs font-bold ring-2 ring-panel ${m.missing ? 'bg-panel-surface text-panel-ink-2' : 'bg-ink text-on-dark'}`}>
            {m.initials}
          </span>
        ))}
      </span>
      <div className="min-w-0 text-xs">
        <p className="font-semibold text-panel-ink">{TEAM_NAME}</p>
        <ul aria-label={fr.team.label} className="flex flex-wrap gap-x-1 text-panel-ink-2">
          {MEMBERS.map((m, i) => (
            <li key={m.key} className={m.missing ? 'italic' : ''}>
              {m.label}
              {i < MEMBERS.length - 1 ? ' ·' : ''}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
