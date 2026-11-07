/**
 * Rôle : feuille de route imprimable d'un camion (ADR-021) : camion, date, dépôt, arrêts dans l'ordre du solveur
 *   (heure prévue, fenêtre, demande, charge cumulée, service), totaux, cases signature et remarques, mention
 *   « Résultat simulé » tant que le solveur n'est pas branché.
 * Choix retenu : `@media print` + `window.print()` (« Enregistrer en PDF » est offert par le navigateur).
 * Alternative écartée : bibliothèque PDF (dépendance lourde, mise en page à refaire, rien de plus pour le chauffeur).
 * Rendue dans <body> via un portail ; masquée à l'écran, seule visible à l'impression (index.css).
 */
import { createPortal } from 'react-dom'
import { fr } from '@/i18n/fr'
import { formatDuration, formatHm } from '@/lib/time'
import type { SharePoint } from '@/lib/share'
import type { Route } from '@/types/vrp'

interface Props {
  route: Route
  points: SharePoint[]
  depotName: string
  date: string
  simulated: boolean
}

export function RouteSheet({ route, points, depotName, date, simulated }: Props) {
  const stops = points.filter((p) => p.order > 0)
  const loads = stops.reduce<number[]>((acc, p) => [...acc, (acc.at(-1) ?? 0) + p.demand], [])
  const km = route.distanceM === null ? '—' : `${(route.distanceM / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`
  const dur = route.start !== null && route.end !== null ? formatDuration(route.end - route.start) : '—'
  return createPortal(
    <section className="print-sheet" aria-hidden>
      <header>
        <h1>{fr.share.sheetTitle(route.vehicleId)}</h1>
        <p>{fr.share.sheetMeta(date, depotName)}</p>
        {simulated && <p className="print-warning">{fr.share.simulated}</p>}
      </header>
      <table>
        <thead>
          <tr>{fr.share.cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
        </thead>
        <tbody>
          {stops.map((p, i) => {
            return (
              <tr key={p.order}>
                <td>{p.order}</td>
                <td>{p.name}</td>
                <td>{p.eta === null ? '—' : formatHm(p.eta)}</td>
                <td>{p.tw ? `${formatHm(p.tw.a)}–${formatHm(p.tw.b)}` : '—'}</td>
                <td>{p.demand}</td>
                <td>{loads[i]}</td>
                <td>{p.service} min</td>
                <td className="print-check"><span className="sr-only">{fr.share.cols.at(-1)}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="print-totals">{fr.share.totals(stops.length, km, dur, route.start === null ? '—' : formatHm(route.start), route.end === null ? '—' : formatHm(route.end))}</p>
      <div className="print-boxes">
        <div><p>{fr.share.signature}</p></div>
        <div><p>{fr.share.remarks}</p></div>
      </div>
    </section>,
    document.body,
  )
}
