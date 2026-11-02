import { PAL } from '../../data'
import styles from './TruckTopDown.module.css'

const WHEELS_BODY = [48, 92, 140]
const BODY_RIBS = [50, 90, 130, 170, 210]

/** Illustration du camion vu de dessus. */
export function TruckTopDown() {
  return (
    <svg viewBox="0 0 360 190" className={styles.root} aria-label="Camion de livraison vu de dessus">
      <defs>
        <filter id="blur"><feGaussianBlur stdDeviation="9" /></filter>
        <linearGradient id="cab" x1="0" x2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor={PAL.blue} /></linearGradient>
      </defs>
      <ellipse cx="180" cy="166" rx="150" ry="12" fill="#0f172a" opacity=".28" filter="url(#blur)" />
      {WHEELS_BODY.map((x) => (<g key={x}><rect x={x} y="44" width="30" height="9" rx="4" fill="#0a1120" /><rect x={x} y="137" width="30" height="9" rx="4" fill="#0a1120" /></g>))}
      <rect x="226" y="48" width="26" height="9" rx="4" fill="#0a1120" /><rect x="226" y="133" width="26" height="9" rx="4" fill="#0a1120" />
      <rect x="16" y="52" width="214" height="86" rx="12" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="16" y="88" width="214" height="14" fill={PAL.pink} opacity=".9" />
      {BODY_RIBS.map((x) => (<line key={x} x1={x} y1="56" x2={x} y2="134" stroke="#e2e8f0" strokeWidth="1.5" />))}
      <rect x="234" y="58" width="96" height="74" rx="22" fill="url(#cab)" />
      <rect x="292" y="66" width="26" height="58" rx="9" fill="#0f172a" opacity=".85" />
      <rect x="240" y="64" width="40" height="62" rx="12" fill="#fff" opacity=".18" />
      <rect x="296" y="50" width="16" height="7" rx="3" fill="#0f172a" /><rect x="296" y="133" width="16" height="7" rx="3" fill="#0f172a" />
    </svg>
  )
}
