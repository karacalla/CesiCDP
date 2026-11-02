import { PAL } from '../data'

/** Couleur d'accent associée au statut d'un arrêt. */
export const statusColor = (status) => {
  if (status.startsWith('Retard')) return PAL.pink
  if (status === 'En avance') return PAL.blue
  return PAL.indigo
}
