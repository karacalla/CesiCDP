/**
 * Rôle : présentation des membres (initiales, libellé) sans jamais inventer de nom.
 * Question probable du jury : « que s'affiche-t-il si un nom manque ? » → « Membre n — à compléter » et « ? ».
 */
import type { TeamMember } from '@/config/team'
import { fr } from '@/i18n/fr'

export interface TeamMemberView {
  key: string
  label: string
  initials: string
  missing: boolean
}

/** Initiales (2 lettres max) d'un nom ; « ? » si le nom est absent ou vide. */
export function initials(name: string | null): string {
  const parts = (name ?? '').trim().split(/[\s-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export function teamView(team: readonly TeamMember[]): TeamMemberView[] {
  return team.map((m, i) => {
    const name = m.name?.trim() || null
    return {
      key: `member-${i + 1}`,
      label: name ? (m.role ? `${name} · ${m.role}` : name) : fr.team.missing(i + 1),
      initials: initials(name),
      missing: name === null,
    }
  })
}
