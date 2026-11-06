/**
 * Rôle : membres du groupe affichés dans l'en-tête (exigence E1 de l'encadrant).
 * Choix retenu : fichier de configuration éditable par l'équipe ; les noms ne sont JAMAIS inventés.
 * Alternative écartée : noms écrits dans le composant (modification de code pour une donnée).
 * Question probable du jury : « pourquoi des champs vides ? » → les noms sont à compléter par l'équipe elle-même.
 *
 * À COMPLÉTER PAR L'ÉQUIPE : remplacer `name: null` par le prénom et le nom de chaque membre.
 * Les initiales sont calculées automatiquement ; tant que `name` est null, l'en-tête affiche « Membre n — à compléter ».
 */

export interface TeamMember {
  /** Prénom et nom, ou null tant que l'équipe ne l'a pas renseigné. */
  name: string | null
  /** Rôle facultatif (ex. « solveur », « interface »). */
  role?: string
}

export const TEAM_NAME = 'CesiCDP — Groupe 6'

export const TEAM: readonly TeamMember[] = [{ name: null }, { name: null }, { name: null }, { name: null }]
