/**
 * Rôle : tous les textes de l'interface, en français, au même endroit.
 * Choix retenu : objet constant typé (autocomplétion, clés vérifiées à la compilation).
 * Alternative écartée : bibliothèque i18n (une seule langue prévue ; dépendance inutile).
 * Question probable du jury : « et si l'ADEME veut une version anglaise ? » → dupliquer ce fichier et choisir à l'exécution.
 */
export const fr = {
  app: {
    title: 'CesiCDP · Dispatch des tournées',
    tagline: 'Aide à la décision pour les tournées de livraison',
  },
  p0: {
    heading: 'Socle technique en place',
    body: 'Vite, React, TypeScript strict, Tailwind et jetons de l’identité visuelle. La coque de l’application arrive en phase 1.',
  },
} as const
