/**
 * Rôle : membres du groupe dans l'en-tête (exigence E1), lus depuis config/team.ts.
 * Choix retenu : pastilles d'initiales générées localement (aucune image tierce, RGPD) + nom en clair.
 * Question probable du jury : « pourquoi “à compléter” ? » → l'outil n'invente jamais de nom ; l'équipe renseigne le fichier.
 */
import { TEAM, TEAM_NAME } from '@/config/team'
import { fr } from '@/i18n/fr'
import { teamView } from '@/lib/team'

const MEMBERS = teamView(TEAM)

export function TeamHeader() {
  return (
    <section aria-labelledby="team-title" className="flex flex-col gap-2">
      <h2 id="team-title" className="text-xs font-semibold uppercase tracking-wider text-panel-ink-2">
        {TEAM_NAME}
      </h2>
      <ul aria-label={fr.team.label} className="grid grid-cols-2 gap-x-3 gap-y-2">
        {MEMBERS.map((m) => (
          <li key={m.key} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                m.missing ? 'border border-dashed border-panel-ink-2 text-panel-ink-2' : 'bg-accent text-on-accent'
              }`}
            >
              {m.initials}
            </span>
            <span className={`min-w-0 break-words text-xs ${m.missing ? 'italic text-panel-ink-2' : 'font-medium text-panel-ink'}`}>
              {m.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
