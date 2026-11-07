/**
 * Rôle : camion porteur vu de dessus, détouré et grand, qui DÉBORDE sur la carte de tournée en dessous (profondeur
 *   par chevauchement, comme la maquette). Dessin original en SVG (aucune image tierce, RGPD) ; neutre (blanc,
 *   encre), un seul détail rose (feux de gabarit) : c'est le camion actif.
 */
import { fr } from '@/i18n/fr'

export function TruckShowcase({ vehicleId, className = '', decorative = false }: { vehicleId: number; className?: string; decorative?: boolean }) {
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': fr.tours.showcaseAlt(vehicleId) }
  return (
    <svg viewBox="0 0 420 132" {...a11y} className={`drop-shadow-2xl ${className}`}>
      <defs>
        <linearGradient id="truck-box" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.5" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe5ec" />
        </linearGradient>
        <linearGradient id="truck-cab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#334155" />
          <stop offset="0.5" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0a1120" />
        </linearGradient>
        <linearGradient id="truck-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0f172a" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
      </defs>
      {/* vue de dessus : les roues sont cachées sous la carrosserie (dessinées, elles ressemblaient à des pattes noires) */}
      {/* caisse : longue et étroite, toit nervuré */}
      <rect x={12} y={18} width={290} height={96} rx={10} fill="url(#truck-box)" stroke="#cbd5e1" />
      <rect x={20} y={26} width={274} height={80} rx={6} fill="none" stroke="#e2e8f0" />
      {[66, 120, 174, 228].map((x) => (
        <line key={x} x1={x} y1={26} x2={x} y2={106} stroke="#e2e8f0" />
      ))}
      <rect x={12} y={18} width={6} height={96} rx={3} fill="#cbd5e1" />
      {/* cabine à nez arrondi */}
      <path d="M306 24 H372 Q404 24 406 66 Q404 108 372 108 H306 Q300 108 300 102 V30 Q300 24 306 24 Z" fill="url(#truck-cab)" />
      <path d="M312 32 H352 V100 H312 Z" fill="#ffffff" opacity={0.05} />
      <path d="M372 32 Q396 36 397 66 Q396 96 372 100 Z" fill="url(#truck-glass)" />
      <path d="M380 42 Q389 48 390 60" stroke="#ffffff" strokeOpacity={0.3} strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* feux de gabarit : le seul détail rose (camion actif) */}
      <rect x={318} y={26} width={22} height={3} rx={1.5} fill="#f471b5" />
      <rect x={318} y={103} width={22} height={3} rx={1.5} fill="#f471b5" />
    </svg>
  )
}
