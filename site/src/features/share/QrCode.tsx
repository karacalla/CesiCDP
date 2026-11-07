/**
 * Rôle : QR code dessiné en SVG à partir de la matrice calculée par `uqr` (ADR-021 : MIT, sans dépendance,
 *   génération locale). Un rectangle par module noir ; marge de 4 modules (norme).
 */
import { useMemo } from 'react'
import { encode } from 'uqr'

export function QrCode({ text, label, size = 168 }: { text: string; label: string; size?: number }) {
  const qr = useMemo(() => encode(text, { ecc: 'M' }), [text])
  const n = qr.size + 8
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${n} ${n}`} width={size} height={size} shapeRendering="crispEdges" className="rounded-xl bg-white">
      <rect width={n} height={n} fill="#ffffff" />
      {qr.data.flatMap((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x + 4} y={y + 4} width={1} height={1} fill="#0f172a" /> : null)))}
    </svg>
  )
}
