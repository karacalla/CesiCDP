# SUIVI — frontend CesiCDP

> À lire en premier à chaque session. ≤ 100 lignes. Détails et justifications : `DOSSIER_CONCEPTION.md`.

## État par phase

| Phase | État | Critère | Preuve |
|---|---|---|---|
| P0 Socle | ✅ terminé (07/11/2026) | build OK ; matrice d'écart + S1–S3 au dossier | `docs/spikes/resultats.json`, `docs/captures/s*.png`, `p0-*.png` |
| P1 Coque et identité | à faire | 1280/768 sans défilement horizontal ; axe sur la coque | |
| P2 Données | à faire | import 1000 clients sans tâche > 100 ms ; erreurs ligne à ligne | |
| P3 Contraintes et lancement | à faire | « non pris en compte » si contrainte non gérée | |
| P4 Résultats | à faire | Gantt 20×50 fluide ; carte ⇔ liste des arrêts | |
| P5 Simulation 3D | à faire | reduced-motion ; camion sur le relief | |
| P6 Étude et finition | à faire | dossier autosuffisant | |

## Prochaine action

P1 : coque (cadre, split 62/38 à bord en S, îlot de navigation, `TeamHeader`, thèmes, RGPD), carte MapLibre vide avec relief + ombrage + voile.

## Matrice d'écart (existant → cible)

| Domaine | Existant (prototype JSX, branche `ckMof`) | Cible | Phase |
|---|---|---|---|
| Langage | JSX, sans types | TS strict, `noUncheckedIndexedAccess` | P0 ✅ |
| Style | CSS modules + Tailwind 4 | Tailwind 4 + `styles/tokens.css` (`@theme inline`) | P0 ✅ |
| Qualité | oxlint (react), aucun test | oxlint (+ts, jsx-a11y, import) ; Vitest ; Playwright ; axe | P0 ✅ socle |
| Thèmes | sombre seul (clair abandonné, `TODO.md`) | panneau clair (défaut) / sombre via `--panel-*` | P1 |
| Carte | MapLibre 6 + OpenFreeMap, 2D, vue France | MapLibre 5.24 + relief Terrarium + voile/vignette | P1 |
| Équipe | absente | `TeamHeader` lit `config/team.ts` (noms à compléter) | P1 |
| Données | `tournees.json` (500 clients France, sans horaires) | NANCY-60 + GEN-1000 via `services/mockApi.ts` | P2 |
| Contrat | aucun | `types/vrp.ts` + Zod + `adapters.ts` | P2 |
| Tracés | une couleur HSL par camion | couches natives drapées ; ambre = sélection ; autres blanc 45 % | P4 |
| Pins | cercles natifs | couche native + regroupement ; « verre » ≤ 40, positionnés par le code | P4 |
| CO₂ | gain calculé par le front (km départ − km final) | tournée de comparaison fournie par le solveur | P4 |
| Prototype monofichier (`bulle`, `src/App.jsx`, Mapbox, Chamonix) | identité « Roam » (verre, pin à pastille, carte d'info + profil, camion vu de dessus, timeline) | identité reprise, code non copié (Google Fonts, 10–11 px, chiffres ad hoc) | P1–P4 |
| Réutilisé | URL du style OpenFreeMap, `formatNumber` fr-FR, palette sombre de l'équipe | | |

## Décisions prises (ADR au dossier §4)

- ADR-001 React 19 conservé (CLAUDE.md dit 18).
- ADR-002 MapLibre **épinglé en 5.24** : deck.gl 9.4 plante sur MapLibre 6 dès que le relief est actif.
- ADR-003 (S1) Tracés en couches natives MapLibre ; deck.gl réservé au camion 3D, avec `z = queryTerrainElevation`.
- ADR-004 (S2) Pins de masse en couche `circle` native + regroupement (au lieu de deck `ScatterplotLayer`) ; « verre » ≤ 40 en éléments positionnés par `map.project`, **jamais** `maplibregl.Marker`.
- ADR-005 (S3) Gantt SVG maison confirmé ; zoom/défilement par `transform` SVG, re-rendu React à la fin du geste.
- ADR-006 TypeScript 7 (compilateur natif) ; oxlint conservé au lieu d'ESLint.

## Décisions ouvertes (à trancher par l'équipe)

1. Noms des 4 membres : à saisir dans `src/config/team.ts` (E1).
2. Source du facteur CO₂ 0,29 kg/km (repris du prototype, non sourcé).
3. Contrat : le solveur a **4** mouvements (`PROBAS_DEFAUT`), CLAUDE.md §5 en annonce 7 → le type suivra le solveur (tableau de longueur libre, noms fournis par le solveur).
4. CLAUDE.md §3 (lignes « Carte », « Pins nombreux ») à mettre à jour selon ADR-002/004 ? (non modifié sans accord).

## Écarts connus

- `tournees.json` et le prototype JSX retirés du site (restent dans l'historique git et dans `algorithme/gen_carte.py`).
- README racine décrit encore Mapbox + `.env` : à réécrire en P1.
- Mesures S2/S3 faites sur un seul poste (AMD Radeon intégrée, D3D11) : à refaire sur le PC de soutenance.

## Journal

- 07/11/2026 — P0 : socle TS, jetons + test de contraste (19 paires), essais S1–S3, ADR-001→006.
