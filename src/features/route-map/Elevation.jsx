import { useMemo } from 'react'
import { elevationProfile, pointAt, PROFILE_W, PROFILE_H } from '../../lib'
import styles from './Elevation.module.css'

/** Profil d'altitude d'une tournée, avec un point à la position `t` (0 → 1). */
export function Elevation({ route, t, color }) {
  const { d, pts } = useMemo(() => elevationProfile(route.coords), [route])
  const [x, y] = pointAt(pts, t)
  return (
    <svg viewBox={`0 0 ${PROFILE_W} ${PROFILE_H}`} className={styles.root}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x} cy={y} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}
