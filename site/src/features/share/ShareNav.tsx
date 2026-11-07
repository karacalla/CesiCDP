/**
 * Rôle : liens vers les applications de navigation, TOUJOURS précédés d'une confirmation : « Les coordonnées des
 *   arrêts seront transmises à ce service » (RGPD : rien ne part sans action explicite et informée).
 *   Google Maps : itinéraire découpé (9 étapes intermédiaires au plus par partie, documentation Google) ;
 *   Waze : arrêt suivant seulement (le service n'accepte qu'une destination) ; Apple Plans : renvoi au GPX.
 */
import { useState } from 'react'
import { ExternalLink, Navigation, ShieldAlert } from 'lucide-react'
import { fr } from '@/i18n/fr'
import { GOOGLE_MAX_WAYPOINTS, googleMapsParts, wazeUrl, type SharePoint } from '@/lib/share'

interface Pending {
  service: string
  url: string
  count: number
}

const btn = 'inline-flex min-h-10 items-center gap-2 rounded-full border border-panel-line bg-panel-surface px-4 text-sm font-semibold text-panel-ink hover:border-panel-ink-2'

export function ShareNav({ points, nextIndex }: { points: SharePoint[]; nextIndex: number }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const parts = googleMapsParts(points, GOOGLE_MAX_WAYPOINTS)
  const step = GOOGLE_MAX_WAYPOINTS + 1
  const next = points[Math.min(nextIndex + 1, points.length - 1)]

  return (
    <section aria-labelledby="share-nav" className="flex flex-col gap-3">
      <h3 id="share-nav" className="text-sm font-semibold text-panel-ink">{fr.share.navTitle}</h3>
      <div className="flex flex-wrap gap-2">
        {parts.map((url, i) => {
          const from = points[i * step]?.order ?? 0
          const to = points[Math.min((i + 1) * step, points.length - 1)]?.order ?? 0
          const count = Math.min(step, points.length - 1 - i * step) + 1
          return (
            <button key={url} type="button" className={btn} onClick={() => setPending({ service: 'Google Maps', url, count })}>
              <Navigation size={16} aria-hidden /> {fr.share.googlePart(i + 1, parts.length, from, to)}
            </button>
          )
        })}
        {next && (
          <button type="button" className={btn} onClick={() => setPending({ service: 'Waze', url: wazeUrl(next), count: 1 })}>
            <Navigation size={16} aria-hidden /> {fr.share.waze(next.order ? `${next.order}. ${next.name}` : next.name)}
          </button>
        )}
      </div>
      <p className="text-xs text-panel-ink-2">{fr.share.limits}</p>
      {pending && (
        <div role="alertdialog" aria-labelledby="share-confirm" className="flex flex-col gap-3 rounded-2xl border border-panel-late p-3">
          <p id="share-confirm" className="flex gap-2 text-sm text-panel-ink">
            <ShieldAlert size={18} aria-hidden className="shrink-0 text-panel-late" /> {fr.share.confirm(pending.service, pending.count)}
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={pending.url} target="_blank" rel="noopener noreferrer" onClick={() => setPending(null)} className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover">
              <ExternalLink size={16} aria-hidden /> {fr.share.open(pending.service)}
            </a>
            <button type="button" className={btn} onClick={() => setPending(null)}>{fr.share.cancel}</button>
          </div>
        </div>
      )}
    </section>
  )
}
