/**
 * Rôle : briques du camion 3D CSS (ADR-025). Chaque face est un plan placé dans l'espace (`preserve-3d`), dont la
 *   normale pointe vers l'extérieur : `backface-visibility: hidden` cache naturellement les faces de dos, quel que
 *   soit le cap. Un voile (`data-shade`) assombrit chaque face selon la lumière (modèle de Lambert, geometry.ts).
 *   Unités : `u(n)` = n × (largeur du conteneur / TRUCK.frame = 460).
 */
import type { CSSProperties, ReactNode } from 'react'
import { faceShade, TRUCK, u, type Face } from './geometry'


const FACE: CSSProperties = { position: 'absolute', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', overflow: 'hidden' }

function Shade({ face, radius, live = true }: { face: Face; radius?: string; live?: boolean }) {
  return <span data-shade={live ? face : undefined} style={{ position: 'absolute', inset: 0, background: '#020617', borderRadius: radius, opacity: faceShade(face, TRUCK.rest.psi), pointerEvents: 'none' }} />
}

export interface BoxProps {
  x: number
  y: number
  w: number
  d: number
  h: number
  base?: number
  fill: Partial<Record<Face, string>> & { side: string }
  radius?: string
  /** Décor par face (dessiné sous le voile d'ombrage). */
  deco?: Partial<Record<Face, ReactNode>>
  part?: string
  /** Ombrage recalculé pendant l'animation (grands volumes) ; sinon fixe (petites pièces). */
  liveShade?: boolean
}

/**
 * Pavé à quatre faces visibles. Le dessous n'est jamais vu ; le flanc nord non plus : sur toute la trajectoire
 * (cap de +16° à −90°, caméra au sud), il tourne le dos à la caméra. Chaque face est une couche 3D du GPU : ne pas
 * dessiner l'invisible réduit le coût de rastérisation (essai S6).
 */
export function Box({ x, y, w, d, h, base = 0, fill, radius = '0', deco = {}, part, liveShade = false }: BoxProps) {
  const f = (face: Face) => fill[face] ?? fill.side
  return (
    <div data-part={part} style={{ position: 'absolute', left: u(x), top: u(y), width: u(w), height: u(d), transformStyle: 'preserve-3d', transform: `translateZ(${u(base)})` }}>
      <div data-face style={{ ...FACE, inset: 0, background: f('top'), borderRadius: radius, transform: `translateZ(${u(h)})` }}>
        {deco.top}
        <Shade face="top" radius={radius} live={liveShade} />
      </div>
      <div data-face style={{ ...FACE, left: 0, top: `calc(100% - ${u(h)})`, width: '100%', height: u(h), background: f('south'), borderRadius: radius, transformOrigin: 'bottom', transform: 'rotateX(-90deg)' }}>
        {deco.south}
        <Shade face="south" radius={radius} live={liveShade} />
      </div>
      <div data-face style={{ ...FACE, top: 0, left: `calc(100% - ${u(h)})`, width: u(h), height: '100%', background: f('front'), borderRadius: radius, transformOrigin: 'right', transform: 'rotateY(90deg)' }}>
        {deco.front}
        <Shade face="front" radius={radius} live={liveShade} />
      </div>
      <div data-face style={{ ...FACE, top: 0, left: 0, width: u(h), height: '100%', background: f('back'), borderRadius: radius, transformOrigin: 'left', transform: 'rotateY(-90deg)' }}>
        {deco.back}
        <Shade face="back" radius={radius} live={liveShade} />
      </div>
    </div>
  )
}

function Disc({ inner = false }: { inner?: boolean }) {
  return (
    <span style={{ position: 'absolute', inset: 0, borderRadius: '999px', background: inner ? 'var(--truck-tire)' : 'radial-gradient(circle at 50% 50%, transparent 58%, var(--truck-tire) 60%)', boxShadow: inner ? 'inset 0 0 0 999px rgb(2 6 23 / 0.35)' : undefined }}>
      {!inner && (
        // jante : tourne avec la distance parcourue (5 goujons rendent la rotation lisible)
        <span data-part="rim" style={{ position: 'absolute', inset: '20%', borderRadius: '999px', background: 'radial-gradient(circle, var(--truck-rim) 0 34%, #475569 36% 40%, var(--truck-rim) 42%)' }}>
          {[0, 72, 144, 216, 288].map((a) => (
            <span key={a} style={{ position: 'absolute', left: '46%', top: '18%', width: '8%', height: '8%', borderRadius: '999px', background: '#334155', transformOrigin: '50% 400%', transform: `rotate(${a}deg)` }} />
          ))}
        </span>
      )}
    </span>
  )
}

/**
 * Roue vue de côté : flanc extérieur (pneu + jante tournante) et flanc intérieur 9 unités plus loin (épaisseur
 * du pneu visible en perspective). `side` : flanc du camion ; `steer` : roue avant (braquage `data-part="steer"`).
 */
export function Wheel({ x, y, side, steer = false }: { x: number; y: number; side: 'south' | 'north'; steer?: boolean }) {
  const r = TRUCK.wheelR
  const s = side === 'south' ? 1 : -1
  const disc = (offset: number): CSSProperties => ({
    ...FACE,
    overflow: 'visible',
    left: u(-r),
    top: side === 'south' ? u(-2 * r) : 0,
    width: u(2 * r),
    height: u(2 * r),
    transformOrigin: side === 'south' ? 'bottom' : 'top',
    transform: `translateY(${u(-s * offset)}) rotateX(${side === 'south' ? -90 : 90}deg)`,
  })
  return (
    <div style={{ position: 'absolute', left: u(x), top: u(y), transformStyle: 'preserve-3d' }}>
      <div data-part={steer ? 'steer' : undefined} style={{ position: 'absolute', transformStyle: 'preserve-3d' }}>
        <div data-face style={disc(9)}><Disc inner /></div>
        <div data-face style={disc(0)}><Disc /></div>
      </div>
    </div>
  )
}
