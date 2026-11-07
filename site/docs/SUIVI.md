# SUIVI — frontend CesiCDP

> À lire en premier à chaque session. ≤ 100 lignes. Détails et justifications : `DOSSIER_CONCEPTION.md`.

## État par phase

| Phase | État | Critère | Preuve |
|---|---|---|---|
| P0 Socle | ✅ terminé (07/11/2026) | build OK ; matrice d'écart + S1–S3 au dossier | `docs/spikes/resultats.json`, `docs/captures/s*.png`, `p0-*.png` |
| P1 Coque et identité | ✅ terminé (07/11/2026) | 1280/768 sans défilement horizontal ; axe sur la coque | `e2e/a11y.spec.ts` (0 violation × 4), `captures/p1-*.png` |
| P2 Données | ✅ terminé (07/11/2026) | import 1000 clients sans tâche > 100 ms ; erreurs ligne à ligne | `e2e/import.spec.ts` (build prod : 0 tâche > 50 ms), `docs/perf/import-1000.json`, `captures/p2-*.png` |
| P3 Contraintes et lancement | ✅ terminé (07/11/2026) | « non pris en compte » si contrainte non gérée | `e2e/run.spec.ts`, `src/services/mockRun.test.ts`, `captures/p3-*.png`, axe 12/12 |
| P4 Résultats | ✅ terminé (07/11/2026) | Gantt 20×50 fluide ; carte ⇔ liste des arrêts | `e2e/journey.spec.ts`, `captures/ux-*.png`, `p4-gantt-*.png`, `spikes/gantt.tsx` (survol p95 16,8 ms), axe 20/20 |
| P4b Immersion · lot 0 essais | ✅ terminé (07/11/2026) | S4 globe, S5 camion mesurés ; ADR-018→022 | `docs/spikes/resultats.json` (S4-*, S5-*), `captures/s4-*.png` |
| P4b · lot 1 plein écran + verre | ✅ terminé (07/11/2026) | 0 défilement à 768/1280/1920 ; contraste du verre testé sur blanc et noir | `e2e/layout.spec.ts` ×6, axe 30/30, `tokens.test.ts` (verre), `captures/p4b-l1-*.png` |
| P4b · lot 2 globe + vol | à faire | ≥ 30 images/s ; CPU ≈ 0 à l'arrêt ; reduced-motion | |
| P4b · lot 3 partage | à faire | GPX valide, impression, dialogue clavier | |
| P4b · lot 4 camion du panneau | à faire | 0 tâche > 50 ms, CLS 0 ; machine d'états testée | |
| P5 Simulation 3D | à faire | reduced-motion ; camion sur le relief | |
| P6 Étude et finition | à faire | dossier autosuffisant | |

## Prochaine action

P4b « Immersion » : lot 0 (essais S4 globe, S5 camion), puis lots 1–4 (plein écran + bulle de verre, globe d'ouverture, partage, camion du panneau) ; puis P5.

## Matrice d'écart (existant → cible)

| Domaine | Existant (prototype JSX, branche `ckMof`) | Cible | Phase |
|---|---|---|---|
| Langage | JSX, sans types | TS strict, `noUncheckedIndexedAccess` | P0 ✅ |
| Style | CSS modules + Tailwind 4 | Tailwind 4 + `styles/tokens.css` (`@theme inline`) | P0 ✅ |
| Qualité | oxlint (react), aucun test | oxlint (+ts, jsx-a11y, import) ; Vitest ; Playwright ; axe | P0 ✅ socle |
| Thèmes | sombre seul (clair abandonné, `TODO.md`) | panneau clair (défaut) / sombre via `--panel-*` | P1 ✅ |
| Carte | MapLibre 6 + OpenFreeMap, 2D, vue France | MapLibre 5.24 + relief + satellite désaturé + ombrage + brouillard + voile | P1 ✅ |
| Équipe | absente | `TeamHeader` lit `config/team.ts` (noms à compléter) | P1 ✅ |
| Données | `tournees.json` (500 clients France, sans horaires) | NANCY-60 + GEN-1000 via `services/mockApi.ts` | P2 ✅ |
| Contrat | aucun | `types/vrp.ts` + Zod + `adapters.ts` ; fiche `docs/CONTRAT_SOLVEUR.md` | P2 ✅ |
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
- ADR-007 Imagerie satellite Sentinel-2 cloudless **2016** (EOX, seul millésime CC BY 4.0), désaturée.
- ADR-008 Navigation par état (Zustand), sans routeur : la carte reste montée d'une vue à l'autre.
- ADR-009 Contrat : schémas Zod = source unique (types déduits) ; horaires d'arrêt **nullables** (le solveur actuel n'en produit pas) ; coordonnées planes acceptées (VRPLIB, Solomon).
- ADR-010 Import dans un Web Worker, parseurs maison (CSV, JSON, VRPLIB, Solomon), store toujours valide.
- ADR-012 Trafic : l'éditeur ILLUSTRE le modèle « temps × coefficient de la tranche de départ » ; toute baisse de coefficient viole FIFO → alerte chiffrée (NANCY-60 en contient une à 09:30, volontairement visible).
- ADR-013 Calcul simulé : seul le recuit sur NANCY-60 non modifiée produit un résultat ; PLNE, Clarke-Wright, autre instance ou instance modifiée → refus explicite (aucun faux résultat).
- ADR-014 Graphiques Recharts : deux graphiques (coût, température) sur un même axe des temps, jamais deux échelles ; couleurs `--chart-1/2` validées par le script dataviz dans chaque thème.
- ADR-015 Un seul effet visuel (Magic UI `BorderBeam`) : bordure ambre pendant le calcul, absente si `prefers-reduced-motion`.
- ADR-016 Parcours en 1 clic : vue d'accueil « Tournées » ; « Calculer les tournées » → bascule automatique sur les tournées, camion 1 sélectionné ; réglages fins dans « Calcul ».
- ADR-017 shadcn/ui : pont de variables vers nos jetons ; `--accent`, `--card`, `--chart-*` jamais redéfinis ; composants dans `components/shadcn/`, effets dans `components/fx/`.
- ADR-018 Plein écran (remplace le cadre de CLAUDE.md §4) ; ADR-019 panneau en verre, opacité minimale garantissant 4,5:1 sur blanc ET noir ; ADR-020 globe natif MapLibre (S4 : 57–60 img/s ; cadrage en Mercator car `cameraForBounds` faux sur le globe ; Mercator explicite à l'arrivée) ; ADR-021 partage local (impression, liens, GPX/GeoJSON/CSV) ; ADR-022 camion du panneau en WAAPI `transform` (S5 : `offset-path` non composé).
- ADR-011 NANCY-60 : clients fictifs + 5 requêtes OSRM uniques (1 matrice, 4 tracés) ; résultat **simulé** commité, marqué comme tel.

## Décisions ouvertes (à trancher par l'équipe)

1. Noms des 4 membres : à saisir dans `src/config/team.ts` (E1).
2. Source du facteur CO₂ 0,29 kg/km (repris du prototype, non sourcé).
3. Contrat : le solveur a **4** mouvements (`PROBAS_DEFAUT`), CLAUDE.md §5 en annonce 7 → le type suivra le solveur (tableau de longueur libre, noms fournis par le solveur).
4. CLAUDE.md §3 (lignes « Carte », « Pins nombreux ») à mettre à jour selon ADR-002/004 ? (non modifié sans accord ; §4 et §3 bis mis à jour le 07/11 sur demande).
5. Profil Mapbox (`VITE_BASEMAP=mapbox`) : déclaré dans `config/basemap.ts` mais **non opérationnel** avec MapLibre (URL `mapbox://`) ; le garder (ADR + `transformRequest`) ou le retirer ?
6. Pousser `bulle` : exige `git push --force` (divergence avec `origin/bulle`).
8. **Modèle de trafic du solveur** : « temps × coefficient de la tranche de départ » (non FIFO) ou vitesse par tranche intégrée (FIFO, Ichoua 2003) ? L'éditeur et l'alerte en dépendent.
9. Capacités des algorithmes (`config/solver.ts`) : à mettre à jour quand le recuit traitera fenêtres/trafic (ou à fournir par l'API).
7. Transmettre `docs/CONTRAT_SOLVEUR.md` + `src/types/vrp.ts` à l'équipe solveur (clés françaises attendues, `contraintes_ignorees`, `comparaison`).

## Écarts connus

- `tournees.json` et le prototype JSX retirés du site (restent dans l'historique git et dans `algorithme/gen_carte.py`).
- Le relief de la vue initiale (plateau lorrain, inclinaison 28°) reste discret ; il se révèle à l'inclinaison (`captures/p1-relief-dark-1280.png`) et en P5.
- NANCY-60 : fenêtres tirées APRÈS la construction des tournées simulées (pour montrer attente et retard) → le résultat simulé déclare `ignoredConstraints: ['timeWindows']`.
- Perf d'import mesurée sur le **build de production** (`npm run test:perf`) ; en dev, le recadrage de la carte sur le relief produit une image de ≈ 120 ms (MapLibre), sans lien avec l'import.
- **Palette** : l'initialisation shadcn (07/11) avait redéfini `--accent` (ambre → gris), `--chart-1/2` et le fond de page ; corrigé par le pont ADR-017, palette inchangée.
- Carte tournée à la sélection d'un camion (le trajet « monte ») : le nord n'est plus en haut ; « Réinitialiser la vue » le rétablit.
- Attribution de la carte repliée derrière « i » à toutes les largeurs (sources complètes au clic).
- Carte d'info masquée sous 1024 px (la carte fait 52 % de la hauteur) : le panneau porte les mêmes informations.
- Éditeur de trafic : après validation par Entrée, l'éditeur est recréé (clé) et le focus revient au début de la page ; validation par sortie de champ sans perte.
- Courbe de convergence simulée en mode mock (seuls les coûts initial et final viennent du résultat simulé) ; étiquetée dans l'interface.
- Table clients : défilement horizontal interne au panneau (9 colonnes dans 38 %).
- Mesures S2–S5 faites sur un seul poste (AMD Radeon intégrée, D3D11) : à refaire sur le PC de soutenance.

## Journal

- 07/11/2026 — P4b lot 1 : plein écran (ADR-018), bulle de verre à deux couches (blanc 96 % / navy 88 %, testé sur blanc et noir), feuille du bas < 1024 px, `lib/cameraPadding`, CLAUDE.md §4 (Cadre, Panneau) et §3 bis (budget d'effets) mis à jour.
- 07/11/2026 — P4b lot 0 : essais S4 (globe : 60 img/s rotation, 58–60 vol, relief + deck.gl compatibles, `cameraForBounds` faux sur globe) et S5 (WAAPI composé, `offset-path` non) ; ADR-018→022.
- 07/11/2026 — Fin de P4 : Gantt SVG (fenêtres, attente hachurée, retard ▼, heure affichée, info-bulle, zoom Ctrl+molette/boutons/glisser par transform) ; mesure sur le composant réel 20×50. Dépendances : retrait de `@deck.gl/extensions` et `@loaders.gl/gltf` (inutilisées), `shadcn` (CLI) passé en dépendance de développement.
- 07/11/2026 — P0 : socle TS, jetons + test de contraste (19 paires), essais S1–S3, ADR-001→006.
- 07/11/2026 — Refonte UX/identité (analyse d'écart avec la maquette « Roam ») : parcours en 1 clic, vue Tournées, tracé à deux états, curseur à cône, pins verre, carte d'info à coin concave, vitrine du camion, cartes de tournées à onglet, navigation détachée, en-tête compact (recherche active, alertes), correction de la palette écrasée par shadcn ; 60 tests unitaires, e2e parcours ×4, axe 20/20.
- 07/11/2026 — P3 : contraintes (interrupteurs, éditeur de tranches contiguës, courbe, alerte FIFO), vue Calcul (algorithmes + capacités, « non pris en compte », réglages du recuit, lancement/annulation, convergence en direct), API `solve` (mock + http) ; 56 tests unitaires, e2e P3, axe 0 violation sur 3 vues.
- 07/11/2026 — P2 : contrat Zod, mock + http + adaptateurs, NANCY-60 (OSRM une fois) et GEN-1000, formulaires, table TanStack v9 virtualisée éditable, import Worker (4 formats), carte des clients ; 47 tests, axe 0 violation.
- 07/11/2026 — P1 : coque (cadre, split 62/38, bord en S + poignée, îlot de navigation, en-tête équipe, thèmes, RGPD), carte drone (satellite, ombrage, relief, ciel/brouillard, voile), axe 0 violation, 24 tests. README racine réécrit, `TODO.md` supprimé (réalisé).
