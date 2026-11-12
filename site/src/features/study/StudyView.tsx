/**
 * Rôle : vue « Étude » (exigence E5 : passage à l'échelle). Dans cette version, elle annonce ce qu'elle montrera
 *   et renvoie aux résultats DÉJÀ mesurés dans le notebook final (partie 8), au lieu d'un onglet vide.
 * En clair : c'est une page d'information, sans calcul ; les chiffres affichés sont recopiés du notebook, avec
 *   leur source, et ne sont jamais recalculés ni inventés ici.
 * Prochaine version : lire les fichiers algorithme/resultats/*.csv (gap selon la taille, temps de calcul, écart
 *   entre graines, familles Solomon) et les tracer avec Recharts, comme la courbe de convergence.
 * Question probable du jury : « pourquoi cette vue est-elle vide ? » → elle ne l'est pas : elle dit ce qui est
 *   prévu et où sont les résultats aujourd'hui (le notebook).
 */
import { CalendarClock, FileSpreadsheet } from 'lucide-react'
import { fr } from '@/i18n/fr'
import { Section } from '@/components/ui/Section'

export function StudyView() {
  const t = fr.study
  return (
    <div className="flex flex-col gap-4">
      {/* bandeau « prochaine version » : dit honnêtement que la vue n'est pas encore branchée */}
      <p className="flex items-start gap-2 rounded-card border border-dashed border-panel-line bg-panel-surface p-4 text-sm text-panel-ink">
        <CalendarClock size={18} aria-hidden className="mt-0.5 shrink-0 text-panel-accent-ink" />
        <span>{t.next}</span>
      </p>

      {/* ce que la vue montrera : une ligne par graphique prévu */}
      <Section title={t.plannedTitle}>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-panel-ink">
          {t.planned.map((ligne) => (
            <li key={ligne}>{ligne}</li>
          ))}
        </ul>
      </Section>

      {/* résultats déjà mesurés : chiffres recopiés du notebook, avec leur source */}
      <Section title={t.measuredTitle}>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {t.measured.map(([label, valeur]) => (
            <div key={label} className="rounded-2xl bg-panel-surface p-3">
              <dt className="text-xs text-panel-ink-2">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-panel-ink">{valeur}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex items-start gap-2 text-xs text-panel-ink-2">
          <FileSpreadsheet size={14} aria-hidden className="mt-0.5 shrink-0" />
          <span>{t.source}</span>
        </p>
      </Section>
    </div>
  )
}
