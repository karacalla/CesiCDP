/**
 * Rôle : camion porteur en VRAIE 3D (volumes : toit, flanc, face avant, roues, ombre au sol), vu de trois quarts,
 *   qui déborde sur la carte de tournée. Neutre (caisse blanche, cabine navy), feux roses = camion actif ; les
 *   roues suivent le thème (jetons `--truck-tire` / `--truck-rim`).
 * Choix retenu (ADR-024) : transformations 3D CSS (`preserve-3d`, perspective) : aucune dépendance, aucun contexte
 *   WebGL supplémentaire, rendu par le compositeur, dimensionné en unités de conteneur (`cqw`).
 * Alternative écartée : modèle glTF + Three.js ou deck.gl dans le panneau (dépendance, second contexte WebGL,
 *   interdit pour un effet par CLAUDE.md §3 bis) ; le camion glTF reste prévu sur la carte (P5).
 * Question probable du jury : « c'est de la 3D ? » → oui : chaque face est un plan placé dans l'espace ; le
 *   navigateur calcule la perspective et l'ordre de profondeur.
 */
import type { CSSProperties, ReactNode } from 'react'
import { fr } from '@/i18n/fr'

/** Unité de dessin : la largeur du camion (420 unités) = 100 % du conteneur. */
const u = (n: number): string => `calc(${n} * var(--u))`

interface BoxProps {
  x: number
  y: number
  w: number
  d: number
  /** Hauteur et altitude du bas de la boîte (unités). */
  h: number
  base?: number
  top: string
  side: string
  front: string
  radius?: string
  children?: ReactNode
}

/** Pavé droit : toit, flanc visible (sud) et face avant (est) ; les faces cachées ne sont pas dessinées. */
function Box({ x, y, w, d, h, base = 0, top, side, front, radius = '0', children }: BoxProps) {
  const face: CSSProperties = { position: 'absolute', backfaceVisibility: 'visible' }
  return (
    <div style={{ position: 'absolute', left: u(x), top: u(y), width: u(w), height: u(d), transformStyle: 'preserve-3d', transform: `translateZ(${u(base)})` }}>
      <div style={{ ...face, inset: 0, background: top, borderRadius: radius, transform: `translateZ(${u(h)})` }}>{children}</div>
      <div style={{ ...face, left: 0, top: '100%', width: '100%', height: u(h), background: side, borderRadius: radius, transformOrigin: 'top', transform: 'rotateX(90deg)' }} />
      <div style={{ ...face, left: '100%', top: 0, width: u(h), height: '100%', background: front, borderRadius: radius, transformOrigin: 'left', transform: 'rotateY(-90deg)' }} />
    </div>
  )
}

/**
 * Roues : disques posés sur un plan vertical juste devant le flanc visible (vue de trois quarts : on voit le flanc
 * des pneus, pas leur bande de roulement). Le bas du disque touche le sol ; le haut passe dans le passage de roue.
 */
function Wheels({ xs }: { xs: number[] }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: u(115), width: u(420), height: u(32), transformOrigin: 'top', transform: 'rotateX(90deg)' }}>
      {xs.map((x) => (
        <span key={x} style={{ position: 'absolute', left: u(x), top: 0, width: u(32), height: u(32), borderRadius: '999px', background: 'var(--truck-tire)', boxShadow: `inset 0 0 0 ${u(9)} var(--truck-tire), inset 0 0 0 ${u(16)} var(--truck-rim)` }} />
      ))}
    </div>
  )
}

export function Truck3D({ vehicleId, decorative = false, className = '' }: { vehicleId: number; decorative?: boolean; className?: string }) {
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': fr.tours.showcaseAlt(vehicleId) }
  return (
    <div {...a11y} className={`@container relative aspect-[420/190] w-full ${className}`}>
      <div aria-hidden className="absolute inset-0" style={{ ['--u' as string]: 'calc(100cqw / 420)', perspective: u(2800), perspectiveOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', left: 0, top: u(52), width: u(420), height: u(132), transformStyle: 'preserve-3d', transform: 'rotateX(54deg) rotateZ(6deg)' }}>
          {/* ombre portée au sol */}
          <div style={{ position: 'absolute', left: u(-6), top: u(4), width: u(430), height: u(132), borderRadius: '50%', background: 'radial-gradient(closest-side, rgb(2 6 23 / 0.5), transparent)', filter: 'blur(6px)' }} />
          {/* caisse : toit nervuré, flanc ombré */}
          <Box
            x={10} y={18} w={292} d={96} h={78} base={16}
            top="repeating-linear-gradient(90deg, #ffffff 0 17.6%, #e2e8f0 17.6% 18.2%)"
            side="linear-gradient(180deg, #f1f5f9, #cbd5e1)"
            front="linear-gradient(180deg, #e2e8f0, #94a3b8)"
            radius="6px"
          />
          {/* cabine : toit navy, pare-brise, feux de gabarit roses, phares */}
          <Box
            x={303} y={24} w={99} d={84} h={62} base={16}
            top="linear-gradient(90deg, #334155, #1e293b 62%, #0f172a)"
            side="linear-gradient(180deg, #334155, #0f172a)"
            front="linear-gradient(180deg, #0f172a 0 48%, #475569 48% 50%, #1e293b 50%)"
            radius="10px"
          >
            <span style={{ position: 'absolute', right: '6%', top: '10%', bottom: '10%', width: '26%', borderRadius: '8px', background: 'linear-gradient(90deg, #0f172a, #475569)' }} />
            <span style={{ position: 'absolute', left: '12%', top: '4%', width: '30%', height: '6%', borderRadius: '9px', background: '#f471b5' }} />
            <span style={{ position: 'absolute', left: '12%', bottom: '4%', width: '30%', height: '6%', borderRadius: '9px', background: '#f471b5' }} />
          </Box>
          <Wheels xs={[46, 84, 250, 338]} />
        </div>
      </div>
    </div>
  )
}
