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
| P4b · lot 2 globe + vol | ✅ terminé (07/11/2026) | ≥ 30 images/s ; CPU ≈ 0 à l'arrêt ; reduced-motion | `e2e/globe.spec.ts` ×5 (60.3 img/s, 0 rendu/s en pause, 0 requête hors tuiles), `docs/perf/globe.json`, `captures/p4b-l2-*.png` |
| P4b · lot 3 partage | ✅ terminé (07/11/2026) | GPX valide, impression, dialogue clavier | `src/lib/share.test.ts` (10), `e2e/share.spec.ts` ×5 (axe 4/4), `captures/p4b-l3-*.png` |
| P4b · lot 4 camion du panneau | ✅ terminé (07/11/2026) | 0 tâche > 50 ms, CLS 0 ; machine d'états testée | `cameoMachine.test.ts` (6), `e2e/cameo.spec.ts` ×2 (0 tâche longue, CLS 0), `docs/perf/cameo-*.json`, `captures/p4b-l4-*.png` |
| P5 Simulation 3D | à faire | reduced-motion ; camion sur le relief | |
| P6 Étude et finition | à faire | dossier autosuffisant | |

## Prochaine action

P5 (simulation) : animer l'heure affichée, vue inclinée, camion glTF ; **appeler `notifySimulation(true/false)`** (T2/T3 du camion du panneau) ; décider du T1 pendant une simulation.

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
| Tracés | une couleur HSL par camion | couches natives drapées ; rose = sélection (ADR-023) ; autres blanc 45 % | P4 |
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
- ADR-015 Effet `BorderBeam` (Magic UI) : bordure lumineuse pendant le calcul, absente si animations réduites.
- ADR-016 Parcours en 1 clic : vue d'accueil « Tournées » ; « Calculer les tournées » → bascule automatique sur les tournées, camion 1 sélectionné ; réglages fins dans « Calcul ».
- ADR-017 shadcn/ui : pont de variables vers nos jetons ; `--accent`, `--card`, `--chart-*` jamais redéfinis ; composants dans `components/shadcn/`, effets dans `components/fx/`.
- ADR-018 Plein écran (remplace le cadre de CLAUDE.md §4) ; ADR-019 panneau en verre, opacité minimale garantissant 4,5:1 sur blanc ET noir ; ADR-020 globe natif MapLibre (S4 : 57–60 img/s ; cadrage en Mercator car `cameraForBounds` faux sur le globe ; Mercator explicite à l'arrivée) ; ADR-021 partage local (impression, liens, GPX/GeoJSON/CSV) ; ADR-022 camion du panneau en WAAPI `transform` (S5 : `offset-path` non composé).
- ADR-023 Palette de l'équipe : **rose = marque** (remplace l'ambre), thème clair conservé avec encres foncées (`#be185d`), retard → indigo, graphiques indigo + rose validés. ADR-024 : camion du panneau en 3D CSS (sans WebGL), animé seulement s'il est visible. ADR-025 Camion du panneau physique : essieu arrière sur clothoïde (R = empattement / tan 40°), vitesse planifiée (accél., freinage, latéral), marche arrière à quai, roulis/tangage/braquage/roues, caméra fixe en perspective, Lambert + ombre portée + reflets ; S6 : 60 img/s à chaud, 0 échec de composition.
- ADR-011 NANCY-60 : clients fictifs + 5 requêtes OSRM uniques (1 matrice, 4 tracés) ; résultat **simulé** commité, marqué comme tel.

## Décisions ouvertes (à trancher par l'équipe)

1. Noms des 4 membres : à saisir dans `src/config/team.ts` (E1).
2. Source du facteur CO₂ 0,29 kg/km (repris du prototype, non sourcé).
3. Contrat : le solveur (niveau A) a **5** mouvements (`PROBAS_FENETRES` par défaut côté site), CLAUDE.md §5 en annonce 7 → le type suit le solveur (tableau de longueur libre).
4. CLAUDE.md §3 (lignes « Carte », « Pins nombreux ») à mettre à jour selon ADR-002/004 ? (non modifié sans accord ; §4 et §3 bis mis à jour le 07/11 sur demande).
5. Profil Mapbox (`VITE_BASEMAP=mapbox`) : déclaré dans `config/basemap.ts` mais **non opérationnel** avec MapLibre (URL `mapbox://`) ; le garder (ADR + `transformRequest`) ou le retirer ?
6. Pousser `bulle` : exige `git push --force` (divergence avec `origin/bulle`).
8. **Modèle de trafic du solveur** : « temps × coefficient de la tranche de départ » (non FIFO) ou vitesse par tranche intégrée (FIFO, Ichoua 2003) ? L'éditeur et l'alerte en dépendent.
9. Capacités (`config/solver.ts`) : fenêtres traitées par le recuit et Clarke-Wright depuis le niveau A (12/11) ; trafic : PLNE seul, à mettre à jour s'il entre dans le recuit.
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
- Rotation du globe : la carte se redessine ≈ 60 fois/s tant que les anneaux pulsent (37/s sans) ; ≤ 60 s, 0 ensuite.
- Mesures S2–S5 et P4b sur un seul poste (AMD Radeon intégrée, D3D11) : à refaire sur le PC de soutenance.

## Journal
- 12/11/2026 — ADR-027 : Solomon/X projetés sur la carte pour l'affichage (calcul sur le fichier, unités « u »). ADR-026 : vrai solveur branché (`algorithme/serveur.py`, `npm run dev:solveur`), unités planes (`lib/units.ts`) ; testé c101 (827,3 = optimum) et NANCY-60 réels à 1280/768 ; e2e mock 36/36. `config/solver.ts` aligné sur le solveur niveau A (5 mouvements, t0 = 2, fenêtres traitées) ; ordre stable des contraintes ignorées (mockRun) ; tests constraints/run mis à jour ; check + e2e run/journey OK, captures 1280/768 regardées. Préparation soutenance : commentaires seulement (aucun code modifié) : en-têtes Rôle/Choix/Alternative/Question ajoutés à `main.tsx`, `lib/utils.ts`, `fx/border-beam.tsx` ; solveur Python commenté (complexités, justifications). typecheck, lint, tests OK.
- 07/11/2026 — Palette de l'équipe (ADR-023, rose = marque, retard indigo), barre de défilement stylée, accrocs corrigés : roues/rétroviseurs du camion qui dépassaient, bouton principal sous le pli de la feuille (768 px), menu Réglages (libellé coupé), contour du camion sélectionné masqué par la carte suivante, bandeau « Résultat simulé » invisible en clair ; onglet découpé des cartes de tournées retiré (masque qui coupait le contour et mordait la carte voisine), roues du camion masquées. 08/11 : camion du panneau en 3D CSS (ADR-024), roues selon le thème, premier plan, animation suspendue hors écran. Camion physique (ADR-025) : modèle, trajectoire, vitesse, caméra, lumière ; essai S6.
- 07/11/2026 — P4b lot 4 : camion du panneau (machine d'états + WAAPI, T1/T4/T5 actifs, T2/T3 prêts pour P5, « Rejouer l'animation »), script de démonstration et questions 13–18 au dossier Lot 3 : partage (feuille de route imprimable, Google Maps découpé N = 9, Waze arrêt suivant, GPX/GeoJSON/CSV, Web Share, QR code via `uqr`, confirmation avant tout service tiers).
- 07/11/2026 — P4b lot 2 : globe d'ouverture (MapLibre globe, dépôts fictifs, arcs, anneaux, fond d'espace CSS), vol 4,5 s + « Passer l'animation »/Échap, retour au globe, réglage « Animations » ; `fadeDuration` 0 ; correctif : enfants du panneau qui se tassaient (feuille du bas). Lot 1 : plein écran (ADR-018), bulle de verre à deux couches (blanc 96 % / navy 88 %, testé sur blanc et noir), feuille du bas < 1024 px, `lib/cameraPadding`, CLAUDE.md §4 (Cadre, Panneau) et §3 bis (budget d'effets) mis à jour.
- 07/11/2026 — Fin de P4 : Gantt SVG (fenêtres, attente hachurée, retard ▼, heure affichée, info-bulle, zoom Ctrl+molette/boutons/glisser par transform) ; mesure sur le composant réel 20×50. Dépendances : retrait de `@deck.gl/extensions` et `@loaders.gl/gltf` (inutilisées), `shadcn` (CLI) passé en dépendance de développement. Puis P4b lot 0 : essais S4 (globe) et S5 (camion du panneau), ADR-018→022.
- 07/11/2026 — Refonte UX/identité (analyse d'écart avec la maquette « Roam ») : parcours en 1 clic, vue Tournées, tracé à deux états, curseur à cône, pins verre, carte d'info à coin concave, vitrine du camion, cartes de tournées à onglet, navigation détachée, en-tête compact (recherche active, alertes), correction de la palette écrasée par shadcn ; 60 tests unitaires, e2e parcours ×4, axe 20/20.

- 07/11/2026 — P0 à P3 : socle TS et essais S1–S3 ; coque et identité ; contrat Zod, NANCY-60, GEN-1000, import Worker, table ; contraintes et calcul simulé (détails : dossier §4–§9).