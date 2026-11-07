/**
 * Rôle : conversions minutes depuis 00:00 ↔ « HH:MM » (le contrat compte le temps en minutes, l'interface en heures).
 */

/** 495 → « 08:15 ». Arrondi à la minute ; 1440 → « 24:00 ». */
export function formatHm(min: number): string {
  const m = Math.round(min)
  const h = Math.floor(m / 60)
  const r = m - h * 60
  return `${String(h).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

/** « 8:15 », « 08h15 », « 08:15 » → 495 ; null si illisible ou hors [00:00, 24:00]. */
export function parseHm(text: string): number | null {
  const m = /^\s*(\d{1,2})\s*[:hH]\s*(\d{2})\s*$/.exec(text)
  if (!m) return null
  const h = Number(m[1])
  const mm = Number(m[2])
  if (mm > 59) return null
  const total = h * 60 + mm
  return total >= 0 && total <= 24 * 60 ? total : null
}

/** Durée en minutes → « 1 h 05 » ou « 45 min ». */
export function formatDuration(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}
