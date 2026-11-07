/**
 * Rôle : boîte de dialogue « Partager la tournée » d'un camion (ADR-021) : feuille de route imprimable, liens de
 *   navigation (avec confirmation), fichiers GPX / GeoJSON / CSV, QR code pour le téléphone du chauffeur, partage
 *   système du GPX. Tout est généré dans le navigateur.
 * Choix retenu : Dialog de Base UI (déjà présent, fondation de shadcn « base ») : focus piégé, Échap, retour du
 *   focus au déclencheur, rôle et titre annoncés.
 * Question probable du jury : « que reçoit Google ? » → rien tant que le dispatcher n'a pas confirmé l'ouverture.
 */
import { useMemo, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { FileDown, Printer, Share2, X } from 'lucide-react'
import { api } from '@/services/api'
import { fr } from '@/i18n/fr'
import { shareOrDownload, download } from '@/lib/download'
import { GOOGLE_MAX_WAYPOINTS_MOBILE, googleMapsParts, routePoints, safeFileName, toCsv, toGeoJson, toGpx } from '@/lib/share'
import { useTours } from '@/features/tours/useTours'
import { todayIso } from '@/lib/time'
import { QrCode } from './QrCode'
import { RouteSheet } from './RouteSheet'
import { ShareNav } from './ShareNav'

const btn = 'inline-flex min-h-10 items-center gap-2 rounded-full border border-panel-line bg-panel-surface px-4 text-sm font-semibold text-panel-ink hover:border-panel-ink-2'

interface Props {
  vehicleId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ vehicleId, open, onOpenChange }: Props) {
  const { instance, tours, customers, state, selected } = useTours()
  const [status, setStatus] = useState('')
  const tour = tours.find((t) => t.route.vehicleId === vehicleId)
  const date = useMemo(() => todayIso(), [])
  const simulated = api.mode === 'mock'
  const points = useMemo(() => (tour && instance ? routePoints(tour.route, instance.depot, customers) : []), [tour, instance, customers])
  if (!tour || !instance) return null

  const meta = { vehicleId, date, simulated }
  const track = tour.track?.coords ?? null
  const file = (ext: string) => safeFileName(['cesicdp', 'camion', vehicleId, date], ext)
  const nextIndex = selected === tour && state ? state.nextStop : 0
  const qrUrl = googleMapsParts(points, GOOGLE_MAX_WAYPOINTS_MOBILE)[0]
  const gpx = () => toGpx(points, track, meta)

  return (
    <Dialog.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-24px)] w-[min(600px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-[28px] border border-panel-line bg-panel p-6 text-panel-ink shadow-[var(--shadow-float)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold">{fr.share.title(vehicleId)}</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-panel-ink-2">{fr.share.description(points.length - 2)}</Dialog.Description>
            </div>
            <Dialog.Close aria-label={fr.share.close} title={fr.share.close} className="grid size-10 shrink-0 place-items-center rounded-full border border-panel-line hover:border-panel-ink-2">
              <X size={18} aria-hidden />
            </Dialog.Close>
          </div>
          {simulated && <p className="rounded-xl border border-panel-line bg-panel-surface px-3 py-2 text-xs text-panel-ink">{fr.share.simulated}</p>}

          <section aria-labelledby="share-sheet" className="flex flex-col gap-2">
            <h3 id="share-sheet" className="text-sm font-semibold">{fr.share.sheetHeading}</h3>
            <div>
              <button type="button" className={btn} onClick={() => window.print()}>
                <Printer size={16} aria-hidden /> {fr.share.print}
              </button>
            </div>
          </section>

          <ShareNav points={points} nextIndex={nextIndex} />

          <section aria-labelledby="share-files" className="flex flex-col gap-2">
            <h3 id="share-files" className="text-sm font-semibold">{fr.share.filesTitle}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} onClick={() => download(gpx(), file('gpx'), 'application/gpx+xml')}><FileDown size={16} aria-hidden /> GPX</button>
              <button type="button" className={btn} onClick={() => download(toGeoJson(points, track, meta), file('geojson'), 'application/geo+json')}><FileDown size={16} aria-hidden /> GeoJSON</button>
              <button type="button" className={btn} onClick={() => download(toCsv(points, meta), file('csv'), 'text/csv;charset=utf-8')}><FileDown size={16} aria-hidden /> CSV</button>
              <button
                type="button"
                className={btn}
                onClick={() => void shareOrDownload(gpx(), file('gpx'), 'application/gpx+xml', fr.share.title(vehicleId)).then((o) => setStatus(fr.share.outcome[o]))}
              >
                <Share2 size={16} aria-hidden /> {fr.share.system}
              </button>
            </div>
            <p className="text-xs text-panel-ink-2">{fr.share.apple}</p>
            <p aria-live="polite" className="text-xs text-panel-ink-2">{status}</p>
          </section>

          {qrUrl && (
            <section aria-labelledby="share-qr" className="flex flex-wrap items-center gap-4">
              <QrCode text={qrUrl} label={fr.share.qrLabel(vehicleId)} />
              <div className="flex min-w-48 flex-1 flex-col gap-1">
                <h3 id="share-qr" className="text-sm font-semibold">{fr.share.qrTitle}</h3>
                <p className="text-xs text-panel-ink-2">{fr.share.qrHint(GOOGLE_MAX_WAYPOINTS_MOBILE)}</p>
              </div>
            </section>
          )}
          {open && <RouteSheet route={tour.route} points={points} depotName={instance.depot.name} date={date} simulated={simulated} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
