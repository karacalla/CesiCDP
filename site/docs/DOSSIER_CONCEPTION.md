# Dossier de conception — interface du dispatcher CesiCDP

*Groupe 6, CESI FISE INFO A3. Réponse à l'appel à manifestation d'intérêt ADEME « Mobilité Multimodale Intelligente ».*
*Ce dossier est autonome : il doit permettre de reconstituer l'interface sans lire le code. Il est complété phase après phase, jamais réécrit.*

## Sommaire

1. Objet et périmètre
2. Besoin et utilisateurs
3. Existant et matrice d'écart
4. Décisions d'architecture (ADR)
5. Essais techniques S1–S6
6. Identité visuelle et jetons
7. Accessibilité
8. Protection des données (RGPD)
9. Tests et qualité
10. Contrat de données *(phase 2)*
11. Limites connues
12. Glossaire
13. Script de démonstration *(phase 6)*
14. Questions probables du jury
Annexe A. Versions et licences

---

## 1. Objet et périmètre

Interface web d'aide à la décision pour un **dispatcher logistique** qui prépare des tournées de livraison sous contraintes de capacité, de fenêtres horaires et de trafic variable selon l'heure (problème CVRPTW à temps de parcours dépendant du temps).

- **Dans le périmètre** : l'application React (saisie des données, contraintes, lancement d'un calcul, lecture des résultats, simulation, étude de passage à l'échelle).
- **Hors périmètre** : le solveur (recuit simulé, PLNE), écrit en Python par l'équipe. L'interface s'y branche par une couche unique `src/services/api.ts`. En attendant, elle fonctionne sur **données simulées déterministes** (`mockApi.ts`).
- **Principe directeur** : le solveur est la seule source de vérité des heures d'arrivée, attentes et retards. L'interface affiche, interpole le long des tracés et valide la saisie ; elle ne recalcule jamais la faisabilité.

## 2. Besoin et utilisateurs

| Public | Attente | Conséquence sur l'interface |
|---|---|---|
| Dispatcher | préparer et vérifier une journée de tournées vite et sans erreur | tables éditables, validation ligne à ligne, statuts toujours libellés |
| Jury d'encadrants | rigueur : complexité, passage à l'échelle, honnêteté des chiffres | vue « Étude », définition de l'objectif affichée près de chaque écart, « non pris en compte » plutôt qu'un faux résultat |
| ADEME (« vendeurs ») | impact : distance, CO₂, lisibilité | indicateurs clés, carte en relief, simulation |

Exigences de l'encadrant (retour du 06/11/2026) et emplacement prévu : E1 membres dans l'en-tête (P1), E2 fenêtres de temps (P2–P4), E3 trafic par tranche (P3, P5), E4 complexité (vue « Méthode », P6), E5 passage à l'échelle (vue « Étude », P6).

## 3. Existant et matrice d'écart

**Inventaire (07/11/2026).** Le dépôt ne contenait pas de prototype `App.jsx` monofichier sous Mapbox, mais un prototype **modulaire en JSX** (branche `ckMof`, environ 500 lignes en 25 fichiers) : React 19, Vite 8, Tailwind 4 et modules CSS, MapLibre 6 via `react-map-gl` avec le style sombre OpenFreeMap (sans clé), une carte des tournées colorées par camion et un tableau de bord (statistiques, CO₂, liste des tournées). Les données (`tournees.json`, 500 clients synthétiques en France, généré par `algorithme/gen_carte.py`) ne contiennent ni heures ni fenêtres. Le prototype n'avait ni TypeScript, ni tests, ni contrôle d'accessibilité, et le mode clair était abandonné.

Sur la branche `bulle` (03/11/2026) existe aussi le **prototype monofichier** `src/App.jsx` (311 lignes) : Mapbox GL 3 + react-map-gl 7 + framer-motion, jeton Mapbox obligatoire, trois tournées et six arrêts dans la vallée de Chamonix avec horaires et statuts écrits à la main. Il fixe l'identité « Roam » reprise ici : pins en verre avec pastille, carte d'info flottante avec mini-profil d'altitude, camion vu de dessus en SVG, cartes de tournée à timeline, îlot de navigation. On en reprend **l'identité, pas le code** (CLAUDE.md §10). Non réutilisable : police chargée depuis Google Fonts (appel à un tiers), textes de 10–11 px, couleur par camion, durée calculée par une formule ad hoc (`km / 27,4 × 92`), CSS injecté sous forme de chaîne.

**Réutilisé** : l'URL du style OpenFreeMap, le principe `fitBounds` sur une tournée, `formatNumber` (fr-FR), la palette sombre de l'équipe (reprise dans les jetons). **Abandonné** : la couleur par camion (contraire à la règle « un seul accent ») et le calcul du gain de CO₂ côté interface (il doit venir d'une tournée de comparaison calculée par le solveur).

| Domaine | Existant | Cible | Phase |
|---|---|---|---|
| Langage | JSX | TypeScript strict | P0 ✅ |
| Style | modules CSS + Tailwind | Tailwind + jetons CSS (`tokens.css`) | P0 ✅ |
| Qualité | oxlint minimal, aucun test | oxlint (TS, a11y, imports), Vitest, Playwright, axe | P0 ✅ |
| Thèmes | sombre seul | panneau clair par défaut et sombre | P1 |
| Carte | 2D, vue France | relief, ombrage, voile, vue de drone | P1 |
| Équipe | absente | en-tête alimenté par `config/team.ts` | P1 |
| Données | JSON figé sans horaires | instances NANCY-60 et GEN-1000, contrat typé validé par Zod | P2 |
| Tracés et pins | couleur par camion | ambre = sélection, autres en blanc 45 %, couches drapées | P4 |
| CO₂ | gain calculé par l'interface | tournée de comparaison fournie par le solveur | P4 |

## 4. Décisions d'architecture (ADR)

Format : contexte → options → critique → choix → conséquence. La pile figée est celle de `CLAUDE.md` §3 ; seules les **déviations** et les choix non triviaux ont une entrée.

### ADR-001 — React 19 plutôt que React 18
- **Contexte** : `CLAUDE.md` prévoit React 18 ; le prototype existant et ses dépendances sont en React 19.
- **Options** : (a) revenir à React 18 ; (b) garder React 19.
- **Critique** : (a) impose une rétrogradation sans bénéfice fonctionnel ; toutes les bibliothèques retenues (react-map-gl 8, TanStack, Recharts 3, Zustand 5, Radix) acceptent React 19.
- **Choix** : (b).
- **Conséquence** : aucune API propre à React 19 n'est indispensable ; un retour à 18 resterait possible.

### ADR-002 — MapLibre GL épinglé en 5.24 (et non 6.x)
- **Contexte** : essai S1. Avec MapLibre 6.15 et le relief activé, l'ajout de la surcouche deck.gl 9.4 (`MapboxOverlay`, mode entrelacé) lève `TypeError: Cannot read properties of undefined (reading 'elevation')`. deck.gl lit `map.transform.elevation`, propriété retirée par MapLibre 6 (déplacée dans `map._camera.transform`).
- **Options** : (a) MapLibre 5.24 (dernière 5.x) ; (b) MapLibre 6 + correctif local qui recrée `map.transform` ; (c) renoncer à deck.gl (et donc au camion glTF).
- **Critique** : (b) dépend d'une API privée et peut casser à chaque mise à jour ; (c) supprime la simulation 3D demandée en P5 ; (a) est stable, documenté, et compatible avec react-map-gl 8.
- **Choix** : (a), version `~5.24.0`.
- **Conséquence** : à réévaluer quand deck.gl publiera une version compatible MapLibre 6. Avec la 5.x, le worker est intégré au paquet (plus besoin de `setWorkerUrl`).

### ADR-003 — Tracés en couches natives, deck.gl réservé au camion 3D (résultat S1)
- **Contexte** : `CLAUDE.md` demande de vérifier si les couches deck.gl suivent le relief.
- **Options** : (a) tout en deck.gl à z = 0 ; (b) deck.gl avec altitude explicite `z = map.queryTerrainElevation(p)` ; (c) tracés en couches `line` natives (drapées automatiquement), deck.gl seulement pour le modèle glTF.
- **Critique** : (a) échoue (0 sommet sur 60 coïncide, voir §5) ; (b) fonctionne (60/60) mais l'altitude doit être recalculée quand les tuiles de relief changent de niveau de détail et le tracé « flotte » ou s'enfonce par endroits ; (c) épouse le relief sans calcul et gère nativement les pointillés (`line-dasharray`).
- **Choix** : (c). Le camion 3D utilise (b) sur **un seul** point par image (coût négligeable), avec un léger décalage vertical contre le scintillement de profondeur.
- **Conséquence** : le trajet « parcouru / à venir » est découpé en deux sources GeoJSON natives, mises à jour pendant la simulation.

### ADR-004 — Pins de masse en couche `circle` native ; « verre » en éléments positionnés par le code (résultat S2)
- **Contexte** : `CLAUDE.md` prévoit deck.gl `ScatterplotLayer` + regroupement pour la masse, des marqueurs HTML pour l'actif et jusqu'à 40 pins visibles.
- **Options** : (a) deck.gl `ScatterplotLayer` ; (b) couche `circle` native avec regroupement intégré (`cluster: true`) ; (c) `maplibregl.Marker` HTML ; (d) éléments HTML positionnés par notre code (`map.project` à chaque rendu).
- **Critique** : (a) et (b) tiennent 60 images/s à 1000 comme à 5000 points ; (a) exige une altitude par point (S1), (b) est drapée et regroupe sans code. (c) s'effondre avec le relief : 1 marqueur = 50 images/s, 40 = 10 images/s, 1000 = 1 image/s, flou ou pas (le coût vient du test d'occultation par le relief que MapLibre fait pour chaque marqueur à chaque image). (d) tient 58–60 images/s jusqu'à 40 éléments en verre.
- **Choix** : (b) pour la masse ; (d) pour l'actif, le survolé et au plus 40 pins visibles ; `maplibregl.Marker` et `<Marker>` de react-map-gl sont **proscrits**.
- **Conséquence** : un composant `GlassPinLayer` maintient lui-même la position des éléments ; ils ne sont pas masqués par le relief (limite acceptable avec une inclinaison de 0 à 30° par défaut, voir §11).

### ADR-005 — Gantt SVG maison, zoom par transformation (résultat S3)
- **Contexte** : Recharts ne fait pas de Gantt ; il faut rester fluide à 20 camions × 50 arrêts (≈ 3450 éléments SVG).
- **Options** : (a) re-rendu React complet à chaque pas de zoom ; (b) transformation SVG (`transform="scale(k,1)"`) pendant le geste, re-rendu React une fois le geste terminé ; (c) canvas.
- **Critique** : (a) mesuré à 167 ms par image (p95) : saccadé. (b) mesuré à 16,8 ms (une image à 60 Hz). (c) perd l'accessibilité et les info-bulles natives ; inutile puisque (b) suffit.
- **Choix** : SVG + d3-scale, lignes mémorisées (`React.memo`), survol par délégation d'événements (p95 = 1,5 ms par mise à jour), zoom et défilement selon (b), traits en `vector-effect: non-scaling-stroke`.
- **Conséquence** : pendant le geste, les étiquettes de l'axe sont étirées ; elles sont redessinées au relâchement.
- **Réalisation (P4, 07/11/2026)** : `features/tours/gantt/` : `ganttScale.ts` (emprise, zoom borné à 30 min, graduations, transformation équivalente, testés), `useGanttZoom.ts` (Ctrl/⌘ + molette, boutons, glisser ; validation 160 ms après le dernier évènement), `GanttRows.tsx` (ligne mémorisée), `GanttTooltip.tsx`. Statut jamais porté par la couleur seule : triangle pour le retard, hachures pour l'attente, contour pointillé pour la fenêtre, et la liste des arrêts en texte. La molette seule fait défiler le panneau (pas de piège de défilement). Couleurs : jetons `--panel-ok/late/wait` (variantes lisibles sur clair), heure affichée en `--panel-accent-ink`.
- **Mesure sur le composant réel** (`spikes/gantt.tsx`, 20 × 50, 3493 éléments, serveur de dev) : premier rendu 97–113 ms ; survol p95 **16,8 ms** (une image), mais **≈ 320 ms au tout premier survol** (montage de l'info-bulle et première graisse de police, une seule fois) ; aperçu Ctrl + molette p95 **33,4 ms** (≈ 30 images/s, repeinture des 3500 éléments) ; zoom par bouton p95 16,7 ms. Données : `docs/spikes/resultats.json` (`P4-gantt-20x50`), capture `captures/p4-gantt-20x50.png`.

### ADR-006 — Outillage : TypeScript 7, oxlint, Vitest, Playwright
- **Contexte** : le prototype utilisait oxlint ; `CLAUDE.md` impose `typecheck`, `lint`, `test`, `test:a11y`, `build`.
- **Choix** : TypeScript 7.0 (compilateur natif, vérification en moins d'une seconde), oxlint conservé (avec les extensions `typescript`, `jsx-a11y` et `import`), Vitest 5 + Testing Library, Playwright pour les captures, l'audit axe et les mesures des essais. Chromium est lancé avec l'accélération GPU (ANGLE/D3D11) pour que les images/s mesurées aient un sens ; le moteur WebGL réellement utilisé est consigné avec chaque mesure.
- **Conséquence** : `npm run check` enchaîne `typecheck && lint && test && build`.

### ADR-007 — Imagerie satellite Sentinel-2 cloudless 2016 (EOX), désaturée
- **Contexte** : l'identité demande une « vue de drone » sur satellite désaturé, sans clé ni compte.
- **Options** : (a) Esri World Imagery ; (b) EOX Sentinel-2 cloudless, millésime récent ; (c) EOX Sentinel-2 cloudless **2016** ; (d) pas de satellite (style vectoriel seul).
- **Critique** : (a) conditions d'usage liées à un compte ArcGIS, ambiguës hors usage personnel ; (b) licence CC BY-NC-SA (pas d'usage commercial, partage à l'identique) ; (c) CC BY 4.0, attribution seule, résolution 10 m suffisante pour une vue régionale ; (d) perd la lecture du terrain (forêts, vallées).
- **Choix** : (c), affiché à −80 % de saturation et luminosité maximale 0,72, sous un ombrage du relief et le réseau routier vectoriel en blanc 16 %.
- **Conséquence** : nouvelle source de tuiles, donc nouvelle requête révélant la zone affichée (§8) ; attribution ajoutée à la carte. Image de 2016 : pas de bâtiments récents (sans incidence pour le dispatch).

### ADR-008 — Navigation par état, sans routeur
- **Contexte** : 5 vues (Données, Contraintes, Calcul, Résultats, Étude) partagent la même carte.
- **Options** : (a) react-router, une URL par vue ; (b) vue active dans le store Zustand.
- **Critique** : (a) ajoute une dépendance et, mal utilisé, démonte la carte (rechargement des tuiles et du relief) ; l'historique du navigateur n'est pas un besoin du dispatcher. (b) garde la carte montée en permanence.
- **Choix** : (b) ; îlot de navigation à 5 boutons, `aria-current="page"` sur la vue active.
- **Conséquence** : pas de lien profond vers une vue ; ajoutable plus tard par l'ancre d'URL sans toucher aux vues.

### ADR-009 — Contrat de données : Zod comme source unique, horaires facultatifs
- **Contexte** : le contrat doit valider les imports et les réponses du solveur, et rester aligné sur `resoudre()`, qui renvoie aujourd'hui des listes d'indices **sans horaire** ; les jeux de référence (VRPLIB, Solomon) ont des coordonnées planes et, pour Solomon, des unités de temps abstraites dépassant 24 h.
- **Options** : (a) interfaces TS + validation écrite à la main ; (b) schémas Zod dont les types sont déduits ; (c) horaires obligatoires, calculés par l'interface quand le solveur n'en fournit pas ; (d) horaires facultatifs (`null`).
- **Critique** : (a) deux vérités qui divergent ; (c) ferait recalculer la faisabilité par l'interface, ce que CLAUDE.md interdit, et produirait des horaires que le solveur n'a pas validés.
- **Choix** : (b) + (d). Coordonnées `lat`/`lng` libres, contrôlées comme géographiques seulement si `meta.coordinates = "geo"` ; horizon accepté jusqu'à 7 jours.
- **Conséquence** : sans horaire, le Gantt affichera « horaires non fournis par cet algorithme ». La fiche `docs/CONTRAT_SOLVEUR.md` décrit à l'équipe solveur les champs à ajouter.

### ADR-010 — Import : Web Worker, parseurs sans dépendance, store toujours valide
- **Contexte** : importer 1000 clients sans bloquer l'interface plus de 100 ms ; signaler les erreurs ligne par ligne ; quatre formats.
- **Options** : (a) analyse sur le fil principal ; (b) Web Worker ; (c) bibliothèque CSV (PapaParse).
- **Critique** : (a) bloque l'interface ; (c) dépendance pour un format simple que nous maîtrisons (guillemets, `;` ou `,`, en-têtes français ou anglais).
- **Choix** : (b) avec des parseurs maison testés (`lib/parsers/`) ; chaque ligne passe par le schéma Zod du client ; les lignes fautives sont écartées et listées (« Ligne 12 — latitude : valeur manquante ou non numérique »). Le store n'accepte que des données valides ; une cellule invalide garde sa saisie et son message.
- **Conséquence** : mesuré sur le build de production, 1000 lignes avec 3 erreurs : 16 ms d'analyse dans le worker, 184 à 331 ms de bout en bout, **aucune tâche longue** sur le fil principal (§9).

### ADR-011 — Instance de démonstration NANCY-60 et résultat simulé
- **Contexte** : il faut une démonstration crédible (relief, trafic, fenêtres) sans solveur branché et sans jamais appeler un service d'itinéraire depuis le navigateur avec des clients.
- **Choix** : `scripts/make-nancy60.ts`, exécuté **une fois** : 60 clients fictifs (graine 60) tirés autour de 15 communes (25 à Nancy et sa périphérie, 35 dans les vallées vosgiennes) ; 5 requêtes au serveur de démonstration OSRM (1 matrice de distances/durées, 1 tracé par camion), sur ces seuls points fictifs ; solution **simulée** (regroupement géographique, plus proche voisin, 2-opt) et horaire calculés dans le script ; fenêtres tirées autour des heures de passage pour illustrer les trois statuts. Tout est commité (`src/data/nancy-60.*.json`).
- **Critique** : ce résultat n'est pas celui du solveur ; il ne respecte pas les fenêtres (tirées après coup).
- **Conséquence** : le résultat simulé est étiqueté (« Résultat simulé (mock) », objectif « … SIMULÉ ») et déclare `ignoredConstraints: ['timeWindows']`. Le tracé (≈ 350 Ko) est chargé à la demande, hors du bundle principal.

### ADR-012 — Trafic : éditeur à tranches contiguës et contrôle FIFO
- **Contexte** : E3 impose le trafic par tranche horaire ; le modèle doit être compris et éditable, et ses défauts visibles.
- **Options** : (a) saisir début et fin de chaque tranche ; (b) ne saisir que la fin (le début est la fin de la précédente, la dernière finit à 24:00), avec « scinder » et « fusionner » ; pour le contrôle : (c) aucun ; (d) détection des baisses de coefficient.
- **Critique** : (a) autorise trous et chevauchements, à rattraper par des messages d'erreur ; (b) rend la contiguïté vraie par construction. Avec le modèle « temps de parcours = temps hors trafic × coefficient de la tranche de départ », une baisse de coefficient permet d'arriver plus tôt en partant plus tard : partir à b − ε arrive à b + T·d_i, partir à b arrive à b + T·d_{i+1} < b + T·d_i.
- **Choix** : (b) + (d). Courbe en escalier du temps d'un trajet de référence (30 min par défaut) qui réagit à chaque saisie ; frontières fautives marquées ; alerte chiffrée (« À 09:30, le coefficient passe de 1,6 à 1,15 : partir à 09:30 fait arriver à 10:05, contre 10:17 en partant une minute plus tôt »). L'interface **illustre** le modèle ; elle ne planifie rien.
- **Conséquence** : NANCY-60 déclenche l'alerte (baisse de 1,6 à 1,15 à 09:30), ce qui sert la démonstration. Remède proposé : vitesse par tranche intégrée à travers les frontières (Ichoua, Gendreau et Potvin, 2003), à arbitrer avec l'équipe solveur.

### ADR-013 — Calcul simulé : refuser plutôt que fabriquer
- **Contexte** : critère P3 : « un algorithme qui ne gère pas une contrainte activée affiche “non pris en compte” et ne produit aucun faux résultat ».
- **Options** : (a) renvoyer le résultat simulé de NANCY-60 quel que soit l'algorithme ; (b) le renvoyer uniquement quand il correspond à la demande, refuser sinon.
- **Critique** : (a) présenterait la solution « recuit » comme un résultat de PLNE ou de Clarke-Wright, ou comme valable pour une instance modifiée : faux résultat.
- **Choix** : (b). Le mock accepte seulement le recuit simulé sur NANCY-60 **non modifiée** (empreinte des clients, du dépôt, de la flotte et du trafic) ; tout autre cas est refusé avec un message qui explique pourquoi. Les contraintes actives que l'algorithme ne traite pas (capacités déclarées dans `config/solver.ts` : seul le PLNE traite fenêtres et trafic, CLAUDE.md §6) sont annoncées **avant** le lancement et inscrites dans le résultat (`ignoredConstraints`).
- **Conséquence** : la démonstration du calcul ne fonctionne que sur NANCY-60 en mode simulé ; avec le solveur branché (`VITE_API_MODE=http`), tout passe par `POST /solve` et le suivi `GET /runs/:id`.

### ADR-014 — Graphiques : Recharts, deux graphiques sur un même axe des temps
- **Contexte** : convergence (coût courant, meilleur coût, température) en direct ; courbe de trafic.
- **Options** : (a) un graphique à deux axes verticaux (coût et température) ; (b) deux graphiques empilés sur le même axe des temps.
- **Critique** : (a) les deux échelles se lisent l'une contre l'autre et suggèrent des croisements sans signification.
- **Choix** : (b). Couleurs `--chart-1` (indigo) et `--chart-2` (ambre), une paire par thème, validées par le script de la méthode dataviz (`validate_palette.js` : bande de luminosité, chroma, séparation pour les daltonismes ΔE ≥ 31, contraste ≥ 3:1) sur `#ffffff`, `#0f172a` et `#1e293b`. Légende dont le texte reste à l'encre du panneau ; info-bulle à réticule ; tableau des valeurs repliable ; ≤ 500 points ; pas d'animation.
- **Conséquence** : nouvelle paire de jetons dépendant du thème ; les couleurs sont lues dans les variables CSS au rendu (le thème est appliqué de façon synchrone par le store).

### ADR-015 — Effets visuels : un seul, au service du sens
- **Contexte** : CLAUDE.md §3 bis autorise jusqu'à 3 effets Magic UI / Aceternity, sous conditions (licence, texte ≥ 12 px, contrastes, `prefers-reduced-motion`, aucun réseau).
- **Choix** : un seul effet, `BorderBeam` (Magic UI, licence MIT, code copié dans `components/fx/` et relu : aucun texte, aucun appel réseau), en ambre, **uniquement pendant le calcul** : il signifie « en cours », pas un décor. Non rendu si l'utilisateur demande moins d'animations (`MotionConfig reducedMotion="user"` ne neutralise que les transformations, pas `offset-distance`).
- **Conséquence** : aucun effet sur la carte, le Gantt ou les tables (performance) ; deux effets restent disponibles.

### ADR-016 — Parcours principal en un clic
- **Contexte** : la tâche principale du dispatcher est d'obtenir les tournées. Avant : vue Données à l'ouverture → îlot « Calcul » → défilement sous les réglages → « Lancer » → « Voir les résultats » (vue vide) : 4 clics et un défilement.
- **Options** : (a) assistant pas à pas ; (b) vue d'accueil « Tournées » avec l'action principale et ses prérequis visibles, réglages fins à part.
- **Critique** : (a) ralentit l'usage quotidien, où les données sont déjà prêtes.
- **Choix** : (b). À l'ouverture : instance, contraintes actives, ce que l'algorithme ne traite pas, et le bouton « Calculer les tournées ». En fin de calcul, bascule automatique sur les tournées, camion 1 sélectionné et recadré. « Réglages avancés » mène à la vue Calcul (algorithme, recuit, convergence).
- **Conséquence** : **1 clic** de l'ouverture aux tournées (`e2e/journey.spec.ts`) ; un résultat devenu obsolète (données modifiées après le calcul) est signalé ; changer d'instance efface le résultat.

### ADR-017 — Intégration de shadcn/ui sans toucher à la palette
- **Contexte** : l'initialisation de shadcn (07/11/2026) a ajouté ses propres variables en fin de feuille : `--accent` (gris clair, au lieu de notre ambre), `--chart-1…5` (gris), fond de page blanc.
- **Choix** : suppression de ces blocs et **pont** de variables shadcn vers nos jetons (`--primary` = ambre, `--muted-foreground` = `--panel-ink-2`, `--border` = `--panel-line`, etc.) ; `--accent`, `--card` et `--chart-*` ne sont jamais redéfinis ; variante `dark:` = notre `data-theme`. Composants shadcn dans `components/shadcn/` (alias de `components.json`), effets dans `components/fx/` (CLAUDE.md §3 bis).
- **Conséquence** : un composant shadcn ajouté hérite de l'identité ; ceux qui emploient `accent` pour un survol neutre seront ajustés au cas par cas.

### ADR-018 — Plein écran : la carte occupe toute la fenêtre (remplace le « cadre » de CLAUDE.md §4)
- **Contexte** : demande du propriétaire (R1, 07/11/2026) : plus de cadre ni de bords. Le cadre encapsulé (`max-w-[1536px]`, rayon 36 px, marges) réduisait la carte de 48 px en hauteur et de 15 à 25 % en largeur sur les grands écrans.
- **Options** : (a) garder le cadre ; (b) carte plein écran (`100dvh`), panneau posé dessus ; (c) plein écran avec panneau latéral opaque collé au bord.
- **Critique** : (a) refusé par le propriétaire ; (c) rend 38 % de la largeur à un panneau opaque : la carte redevient une « moitié d'écran ».
- **Choix** : (b). Carte `absolute inset-0`, hauteur `100dvh`, aucun défilement de page ; l'identité « Roam » (rayon 36 px, bord clair, ombre) passe du cadre au panneau flottant (ADR-019). Toute animation de caméra passe par `lib/cameraPadding.ts`, qui décale le cadrage de la largeur du panneau.
- **Conséquence** : la colonne d'outils et l'attribution se placent dans la zone visible (à gauche du panneau ; au-dessus de la feuille sous 1024 px) ; le bord en S n'a plus de raison d'être (le panneau ne touche plus de bord).

### ADR-019 — Panneau en bulle de verre, opacité fixée par le calcul
- **Contexte** : R4 (bulle semi-transparente flottante). Le verre fait passer le texte sur un fond variable : le contraste ne se vérifie plus « en théorie ».
- **Options** : (a) opacité choisie à l'œil ; (b) opacité **minimale** telle que chaque texte du panneau garde ≥ 4,5:1 dans le pire cas, c'est-à-dire fond translucide composé sur **blanc pur** et sur **noir pur** ; (c) panneau opaque.
- **Critique** : (a) invérifiable ; (c) ne répond pas à R4.
- **Choix** : (b). Jetons `--glass-bg`, `--glass-border`, `--glass-blur` (≤ 24 px), `--glass-shadow` par thème dans `tokens.css` ; `tokens.test.ts` compose le fond sur blanc et sur noir et échoue si `--ink`, `--ink-2`, les encres d'état ou le texte du thème sombre passent sous 4,5:1. Repli opaque pour `prefers-reduced-transparency: reduce` et `@supports not (backdrop-filter)`. Le verre est un **style**, pas un effet (il ne compte pas dans le budget de CLAUDE.md §3 bis).
- **Conséquence** : la transparence réelle reste faible, le flou porte l'essentiel de l'impression de verre ; c'est le prix d'un contraste garanti sur n'importe quelle carte.

### ADR-020 — Globe d'ouverture natif MapLibre, puis vol vers les tournées (résultat S4)
- **Contexte** : R2 : tant qu'aucune tournée n'existe, un globe esthétique tourne avec des dépôts simulés ; à l'apparition des tournées, zoom jusqu'à elles.
- **Options** : (a) projection `globe` de MapLibre 5.24 (déjà présent) ; (b) globe Three.js ou deck.gl `GlobeView` séparé puis bascule vers la carte ; (c) vidéo ou image animée.
- **Critique** : (b) second contexte WebGL, nouvelle dépendance, raccord visible entre deux moteurs ; (c) lourd, non interactif, sans lien avec les données. (a) mesuré en S4 : globe, atmosphère, relief et deck.gl fonctionnent ensemble, 57–60 images/s, aucune tâche longue pendant le vol.
- **Choix** : (a). Scène dérivée du store (`globe` → `flying` → `routes`), sans nouvel état global. Rotation ≈ 3,5°/s dans **un seul** `requestAnimationFrame` plafonné à 30 images/s, arrêtée à la première interaction, après 60 s, hors de la scène `globe` et si l'onglet est caché ; bouton pause/lecture. Dépôts fictifs (étiquetés « démonstration ») en couche `circle` native, anneaux ambre animés par la même boucle ; arcs de grand cercle calculés une fois. Vol de 4,5 s (ease-in-out) vers l'emprise des tournées ; **cadrage calculé en Mercator** (`@math.gl/web-mercator`, déjà présent comme dépendance de deck.gl) car `cameraForBounds` sur le globe donne un zoom faux (7,7 au lieu de 10,7, S4) ; projection Mercator explicite à l'arrivée (deck.gl choisirait sinon `GlobeView` pour le camion de P5). Fond d'espace en CSS statique (étoiles, halo solaire, liseré), jamais animé. `prefers-reduced-motion` ou réglage « réduites / aucune » : globe fixe, saut direct avec fondu ≤ 150 ms.
- **Conséquence** : effet n° 2 du budget (§3 bis) ; aucune requête hors tuiles ; les tuiles du globe (zooms 3 à 6) révèlent seulement « Europe » (RGPD §8).

### ADR-021 — Partage des tournées généré localement
- **Contexte** : R3 : feuille de route ou parcours pour les applications de navigation. Contrainte RGPD : aucune donnée client vers un tiers sans action explicite.
- **Options** : (a) bibliothèque PDF ; (b) page imprimable (`@media print` + `window.print()`) ; (c) liens « itinéraire » des services de navigation ; (d) fichiers GPX, GeoJSON, CSV générés dans le navigateur ; (e) QR code du lien.
- **Choix** : (b) + (c) + (d) ; (e) sous réserve d'une bibliothèque locale sans dépendance (sinon retirée). Génération par `Blob` + `URL.createObjectURL` (révoqué), noms de fichiers assainis, XML échappé, coordonnées à 6 décimales. Avant d'ouvrir un service tiers : message « Les coordonnées des arrêts seront transmises à ce service » et confirmation. Google Maps : itinéraire découpé selon la limite documentée des points d'étape ; Waze : arrêt suivant seulement (limite du service, écrite dans l'interface) ; Apple Plans : renvoi au GPX faute de format multi-étapes documenté. Web Share (fichier GPX) quand `navigator.canShare` l'accepte, sinon téléchargement. Toute feuille porte « Résultat simulé » tant que le solveur n'est pas branché.
- **Conséquence** : aucune bibliothèque PDF ; la mise en page d'impression est testée en e2e (`emulateMedia('print')`).
- **Limites vérifiées dans la documentation officielle (07/11/2026)** : Google Maps URLs, action *Directions* : « up to three waypoints supported on mobile browsers, and a maximum of nine waypoints supported otherwise », séparateur `|` encodé `%7C`, virgule `%2C`, URL ≤ 2 048 caractères → **N = 9** étapes intermédiaires par partie (10 tronçons), **3** pour le QR code destiné au téléphone. Waze (*deep links*) : `https://www.waze.com/ul?ll=lat,lng&navigate=yes`, aucune étape documentée → arrêt suivant seulement.
- **QR code (dépendance ajoutée)** : `uqr` 0.1.3 (unjs, MIT, **aucune dépendance**, 79 Ko décompressé) ; seule la fonction `encode` est utilisée, le dessin SVG est fait par nos soins (pas d'`innerHTML`). Écartée : `qrcode-generator` (556 Ko). Le QR code ne transmet rien : il contient le lien, qui n'est ouvert que par le chauffeur.

### ADR-022 — Camion du panneau : animation compositeur pilotée par une machine d'états (résultat S5)
- **Contexte** : R5 : le camion du panneau roule, sort par le coin supérieur du panneau et revient selon des critères précis ; impressionner sans coûter.
- **Options** : (a) `offset-path` CSS ; (b) images clés `transform` précalculées depuis `SVGPathElement.getPointAtLength`, jouées par WAAPI ; (c) boucle `requestAnimationFrame`.
- **Critique** : S5 : (a) et (b) donnent 0 tâche longue et un décalage de mise en page nul, mais la trace Chromium indique pour (a) `compositeFailed` (`offset-distance` non composable) : l'animation tourne sur le fil principal. (b) est composée (aucun échec signalé), précalcul 3,7 ms pour 49 images clés. (c) occupe le fil principal à chaque image.
- **Choix** : (b). Déclencheurs dans `config/cameo.ts` : T1 changement de camion, T2/T3 début/fin de simulation (évènements prêts, câblés en P5), T4 première apparition des tournées, T5 passage de démonstration après 120 s d'inactivité, au plus 1 par 10 min, jamais pendant un calcul. Machine d'états pure, testée avec une horloge simulée ; file d'attente (jamais deux animations) ; `will-change` seulement pendant l'animation ; rien si l'onglet est caché. Réglage « Animations : complètes / réduites / aucune ».
- **Conséquence** : effet n° 3 du budget (§3 bis : BorderBeam, globe, camion). L'information « Camion N · en tournée » reste dans le DOM en permanence ; la couche animée est `aria-hidden`.

### ADR-023 — Palette de l'équipe : le rose devient l'accent de marque (remplace l'ambre)
- **Contexte** : demande du propriétaire (07/11/2026) : utiliser la palette de l'équipe : fonds `#0f172a` / `#0c1425` / `#0a1120`, surface `#1e293b`, texte atténué `#6d7580`, accents rose `#f471b5`, indigo `#818cf8`, bleu `#3abdf8`. Aucune teinte ambre. Le rose servait au statut « retard », le bleu à « attente ».
- **Options** : accent principal (a) indigo, (b) rose, (c) bleu ; thème clair conservé ou supprimé.
- **Choix (propriétaire)** : **(b) rose** pour la marque, la sélection, le trajet parcouru, l'action principale, les pins, le focus ; **thème clair conservé**, avec pour le texte sur fond clair une version plus foncée de la même teinte (`--accent-ink` `#be185d`, 6,04:1 sur blanc).
- **Conséquences** : le statut « retard » passe à l'**indigo** (`#818cf8` sur sombre, 5,98:1 ; `#4f46e5` sur clair, 6,29:1) pour qu'un camion sélectionné ne ressemble jamais à un retard ; « attente » reste bleu, « à l'heure » reste vert (hors palette, sens universel). Indigo et bleu sont proches sur fond sombre (ΔE 13,5, script dataviz) : sans gravité car l'attente est toujours hachurée, le retard toujours marqué ▼ et libellé. Graphiques : indigo + rose (`#4f46e5` / `#be185d` en clair, `#6366f1` / `#ec4899` en sombre), validés par le script dataviz dans les deux thèmes. Halo du fond d'espace, anneaux et arcs du globe, feux du camion, lueur des phares, bordure lumineuse du calcul : rose. Tous les contrastes (dont le verre composé sur blanc et noir) restent vérifiés par `tokens.test.ts` (54 tests).

### ADR-024 — Camion du panneau en 3D CSS, au premier plan, animé seulement s'il est visible
- **Contexte** : demande du propriétaire (08/11/2026) : roues visibles et adaptées au thème, camion au premier plan, camion en 3D « si possible », animation inutile quand le camion n'est pas à l'écran.
- **Options 3D** : (a) modèle glTF rendu par Three.js ; (b) deck.gl `ScenegraphLayer` dans le panneau ; (c) transformations 3D CSS (faces placées dans l'espace, `preserve-3d`, perspective).
- **Critique** : (a) nouvelle dépendance et second contexte WebGL ; (b) deck.gl est lié à la carte ; les deux sont interdits pour un effet par CLAUDE.md §3 bis (« pas de canvas ni de WebGL supplémentaire »). (c) : aucune dépendance, rendu par le compositeur, dimensionné en unités de conteneur (`cqw`), donc net à toutes les largeurs.
- **Choix** : (c), `features/tours/Truck3D.tsx` : caisse (toit nervuré, flanc, face avant), cabine (toit navy, pare-brise, feux roses), roues en disques sur le plan du flanc (pneu `--truck-tire`, jante `--truck-rim` : `#1e293b`/`#6d7580` en clair, `#6d7580`/`#cbd5e1` en sombre, couleurs de la palette), ombre au sol ; vue de trois quarts (`rotateX(54°) rotateZ(6°)`). Le camion passe au-dessus de la carte de tournée (`z-20`). Animation : un `IntersectionObserver` suit la baie ; visible à moins de 50 %, aucune animation n'est jouée (changement d'état immédiat), le passage de démonstration (T5) est suspendu, et une animation en cours se termine si la baie sort de l'écran.
- **Conséquence** : remplace `TruckShowcase.tsx` (SVG à plat, supprimé). Mesuré (`e2e/cameo.spec.ts`) : toujours 0 tâche longue et décalage de mise en page 0 pendant l'animation ; aucune animation quand le panneau est défilé jusqu'aux arrêts. Le camion glTF reste prévu sur la carte en P5 (ADR-003).

### ADR-025 — Camion du panneau physiquement réaliste (remplace l'animation d'ADR-022 et le modèle d'ADR-024)
- **Contexte** : demande du propriétaire (08/11/2026) : analyser, critiquer, essayer, puis ne livrer que la solution la plus réaliste (forme, courbe, trajectoire, mouvement, suivi de caméra, reflets, ombres).
- **Critique de l'existant** :

| Aspect | Avant | Défaut |
|---|---|---|
| Forme | trois pavés, roues en disques plats, 3 faces | pas de cabine lisible, pas d'épaisseur de pneu ; une rotation aurait montré des faces manquantes |
| Trajectoire | Bézier libre, point suivi = centre du camion | courbure arbitraire (rayon parfois < longueur du camion), l'arrière « glisse » |
| Mouvement | rotation 2D de l'image entière, `cubic-bezier` | le camion 3D tourne comme un autocollant ; vitesse sans limite d'accélération ; roues immobiles ; ni roulis ni tangage |
| Caméra | réduction d'échelle fixe (×0,72), inclinaison fixe | aucune perspective réelle quand le camion s'éloigne |
| Lumière | dégradés figés, ombre floue fixe | l'ombre ne tourne pas, les faces ne changent pas de teinte, aucun reflet |
| Effets | traînée pointillée rose, fondu en fin de course, lueur rose | décor non physique |

- **Plan retenu** (une seule solution livrée) : (1) modèle à faces orientées (`backface-visibility`) ; (2) trajectoire de l'essieu arrière ; (3) planification de vitesse ; (4) caméra fixe qui suit du regard ; (5) éclairage par face et ombre portée ; (6) images clés par pièce, temps linéaire, la physique étant dans les échantillons.
- **Choix** :
  - *Forme* (`features/truck3d/`) : porteur cabine avancée (cabine blanche, habitacle vitré en retrait, déflecteur, rétroviseur, calandre, pare-chocs), caisse à toit nervuré et bandeau rose, portes et feux arrière, trois essieux (tandem arrière), pneus épais (deux flancs), jantes à 5 goujons. Faces jamais visibles (dessous, flanc nord sur toute la trajectoire) non dessinées.
  - *Trajectoire* (`cameo/motion.ts`) : celle de l'essieu arrière (pivot réel d'un véhicule non articulé) ; ligne droite, **clothoïde** (le volant tourne progressivement), arc de **rayon 330 unités = empattement / tan 40°** (braquage maximal d'un porteur), clothoïde, ligne droite ; braquage des roues avant = `atan(empattement × courbure)`.
  - *Mouvement* : vitesse planifiée (passe avant : accélération ≤ 330 u/s² ; passe arrière : freinage ≤ 300 u/s² ; plafond `√(a_lat / courbure)` dans le virage), à-coups lissés, arrêt de 0,35 s avant le départ (desserrage du frein) ; retour **en marche arrière** à 0,4 × la vitesse avant, jusqu'à l'arrêt dans la baie ; roulis ∝ v²·courbure (la caisse penche vers l'extérieur), tangage ∝ accélération (cabré au départ, plongée au freinage) ; rotation des jantes = distance / rayon. Temps accéléré ≈ ×3 (lisibilité), rapports réalistes conservés.
  - *Caméra* : fixe, élévation 36° au repos, distance = perspective CSS ; quand le camion s'éloigne, l'échelle, l'inclinaison apparente (vue plus rasante) et l'azimut découlent de la projection (aucun facteur arbitraire). La trajectoire est coupée quand le camion entier a quitté l'écran.
  - *Lumière* : soleil en haut à gauche (même côté que le halo du globe) ; voile par face selon Lambert, recalculé au fil du virage ; ombre portée décalée selon le soleil, qui tourne avec le camion ; occlusion sous le véhicule et ombres de contact des pneus ; reflet du ciel qui glisse sur le pare-brise et les vitres ; phares et faisceaux au sol en marche avant, feux de recul en marche arrière, feux stop au freinage.
  - *Rendu* : 36 animations WAAPI (`transform` / `opacity` seulement), créées avant l'affichage de la couche ; valeurs constantes posées sans animation.
- **Conséquences** : la traînée pointillée, le fondu et l'échelle arbitraire sont supprimés. Mesures (S6 et `e2e/cameo.spec.ts`) : 0 échec de composition, mise en place 23–33 ms, 0 tâche longue et 0 décalage de mise en page pendant l'animation, 60 images/s une fois le GPU chaud. Limite : la toute première animation d'une session compile les shaders du GPU (≈ 0,2 s de saccade), masquée par l'arrêt de départ ou par le départ hors écran du retour.

## 5. Essais techniques S1–S6

Poste de mesure : Windows 11, Chromium (Playwright 1.65), GPU « AMD Radeon (TM) Graphics » via ANGLE Direct3D 11, fenêtre de 1280 × 800. Mesures brutes : `docs/spikes/resultats.json`. Pour rejouer : `npm run spikes`. Code des essais : `spikes/` (jetable, non inclus dans le build).

### S1 — deck.gl suit-il le relief MapLibre ?
- **Protocole** : tracé de 60 sommets traversant la vallée de Gérardmer (altitudes affichées de 919 à 1246 m, exagération 1,4), vue inclinée à 62°. Le même tracé est dessiné en couche native (référence drapée), puis en deck.gl `PathLayer` à z = 0, puis avec z = `queryTerrainElevation`. Pour chaque sommet, on projette le point avec la carte (projection tenant compte du relief) et on interroge deck.gl (`pickObject`, rayon 4 px).
- **Résultat** : z = 0 → **0 / 60** sommets coïncident ; z interrogé → **60 / 60**. Préalable : deck.gl 9.4 est incompatible avec MapLibre 6 dès que le relief est actif (ADR-002).
- **Conclusion** : l'essai échoue pour deck.gl à z = 0. Repli appliqué : tracés natifs, altitude du camion par `queryTerrainElevation` (ADR-003). Capture : `captures/s1-relief-deckgl.png`.

### S2 — 1000 clients à ≥ 45 images/s ?
- **Protocole** : n points tirés avec une graine fixe autour de Nancy, relief actif, inclinaison de 30°, caméra en rotation continue pendant 5 s. On compte les images du navigateur (`requestAnimationFrame`).

| Variante | n | images/s | p95 durée d'image |
|---|---|---|---|
| deck.gl `ScatterplotLayer` (z interrogé) | 1000 | 59,6 | 20,1 ms |
| deck.gl `ScatterplotLayer` (z interrogé) | 5000 | 60,0 | 21,2 ms |
| couche `circle` native + regroupement | 1000 | 59,8 | 21,9 ms |
| couche `circle` native + regroupement | 5000 | 60,0 | 22,7 ms |
| `maplibregl.Marker` verre (flou 24 px) | 1 / 40 / 1000 | 49,8 / 10 / 1 | 33 / 117 / 2267 ms |
| `maplibregl.Marker` opaque (sans flou) | 40 / 1000 | 11,2 / 1 | 117 / 1817 ms |
| éléments verre positionnés par le code | 1 / 40 | 60,2 / 58,0 | 16,7 / 16,8 ms |

- **Conclusion** : critère atteint (≥ 45 images/s à 1000 points) en GPU, natif comme deck.gl. Les marqueurs MapLibre sont proscrits avec le relief ; le verre reste possible s'il est positionné par le code (ADR-004). Captures : `captures/s2-gpu-1000.png`, `captures/s2-native-1000.png`.

### S3 — Gantt 20 camions × 50 arrêts fluide ?
- **Protocole** : Gantt SVG (fenêtres, attentes hachurées, service), 3453 éléments SVG ; 300 survols successifs, 20 pas de zoom par re-rendu React puis 20 par transformation SVG. Durées React mesurées par `<Profiler>`, durées d'image par `requestAnimationFrame`, tâches longues par `PerformanceObserver`.
- **Résultat** : premier rendu 116 ms ; survol p95 **1,5 ms** (max 3,5 ms) ; zoom par re-rendu p95 **167 ms par image** (React 85 ms) ; zoom par transformation p95 **16,8 ms**.
- **Conclusion** : critère atteint avec la stratégie de l'ADR-005 ; le re-rendu complet pendant un geste est à proscrire. Capture : `captures/s3-gantt.png`.

### S4 — Globe MapLibre 5.24 (projection, atmosphère, relief, vol, deck.gl)
- **Protocole** (`spikes/s4.ts`, `npm run spikes`) : style de l'application + satellite EOX + projection `globe` + atmosphère (`atmosphere-blend` 1 jusqu'au zoom 5, 0 au zoom 7) ; panneau simulé de 540 px (marge droite de la caméra) ; couche deck.gl `ScatterplotLayer` entrelacée ; rotation 5 s à 3,5°/s ; vol `flyTo` de 4,5 s vers NANCY-60 ; deux variantes : relief actif dès le globe, ou seulement à l'arrivée.
- **Résultats** : aucune erreur ; rotation **60,2 images/s** (p95 16,7 ms) ; vol **57,6 / 60,2 images/s**, **aucune tâche longue pendant le vol** (une tâche de 520–620 ms au chargement du style, préexistante) ; imagerie EOX servie aux zooms 3 à 12 sans échec ; deck.gl répond au survol sur le globe, après le vol et en Mercator ; `cameraForBounds` sur le globe rend un zoom de **7,7** au lieu de **10,66** (calcul Mercator : centre exact dans la zone visible, x = 370 px pour 370 attendus) ; à l'arrivée (zoom 10,7) la projection est encore entièrement « globe » (transition = 1).
- **Conclusion** : critère atteint ; relief compatible (gardé actif, pas d'écart d'images/s) ; cadrage par calcul Mercator, Mercator explicite à l'arrivée (ADR-020). Captures : `captures/s4-globe.png`, `s4-globe-terrain.png`.

### S5 — Animation du camion du panneau : `offset-path` ou WAAPI ?
- **Protocole** (`spikes/s5.ts`, `e2e/s5.spec.ts`) : même trajet (courbe du panneau vers le coin supérieur droit puis hors écran), 2,8 s ; mesures : tâches longues, `layout-shift`, intervalle entre images ; trace Chromium `blink.animations` pour savoir si l'animation est composée. Tentative écartée : deux captures pendant un blocage du fil principal (une capture attend le fil principal : résultat inexploitable).
- **Résultats** : (a) `offset-path` : 0 tâche longue, CLS 0, p95 16,7 ms, mais trace `compositeFailed`, propriété non composable `offset-distance` ; (b) WAAPI `transform` : 0 tâche longue, CLS 0, p95 16,8 ms, aucun échec de composition, précalcul 3,7 ms.
- **Conclusion** : (b) retenu (ADR-022) : l'animation continue même si le fil principal est occupé (calcul, import).

### S6 — Camion physique : coût de rendu et composition (08/11/2026)
- **Protocole** : `e2e/s6.spec.ts` (séquence d'images de la sortie et du retour, trace `blink.animations`) ; variantes A/B mesurées par la trace `viz` (`Display::DrawAndSwap`, tâches du processus GPU) sur « Rejouer l'animation ».
- **Résultats et décisions** :

| Essai | Mesure | Décision |
|---|---|---|
| Première version (134 animations) | 20 échecs de composition « aucun changement visible », fil principal 91 ms au départ | animer seulement ce qui change ; animations créées avant d'afficher la couche → 50 animations, 0 échec, 57 ms |
| Ombres en `filter: blur` | tâche GPU de 170–190 ms au départ | remplacées par des dégradés masqués (même rendu, pas de filtre) |
| `will-change` sur chaque face | tâches GPU jusqu'à 171 ms, plus de saccades | **rejeté** (trop de couches) |
| Faces jamais visibles retirées (flanc nord, châssis) | 36 animations, fil principal 41 ms | retenu |
| A/B à froid / à chaud | 1re animation de la session : 47–52 img/s ; ensuite **60 img/s**, écarts ≤ 34 ms ; sans masque, sans halos : identique à chaud | coût à froid = compilation des shaders, une fois ; masques et halos conservés |

- **Conclusion** : le réalisme (≈ 100 éléments 3D, 36 animations) tient 60 images/s sur le poste de mesure (GPU intégré). Images : `captures/s6-sortie-*.png`, `captures/s6-retour-*.png`.

## 6. Identité visuelle et jetons

### 6.1 Gabarit (P1)
- **Cadre** : application centrée, largeur max. 1536 px, rayon 36 px, bordure blanc 10 %, sur fond `--bg-darker`. Hauteur = fenêtre − 48 px (min. 640 px) à partir de 1024 px.
- **Répartition** : la carte occupe 62 % à gauche et **passe sous le panneau** sur 40 px ; le panneau (38 %) a un bord gauche en S (SVG étiré : pleine largeur en haut, inflexion au milieu, affleurant en bas) avec ombre portée. La **poignée** au point d'inflexion est un vrai bouton (« Replier / Déplier le panneau », `aria-expanded`) qui rend toute la largeur à la carte.
- **Sous 1024 px** : carte en haut (52 % de la hauteur, min. 380 px), panneau en dessous, arrondi en haut et remontant de 40 px sur la carte ; aucune largeur fixe, donc aucun défilement horizontal (vérifié à 768 px).
- **Sur la carte** : marque « CesiCDP » (800) et contexte « Dispatch logistique » (300) sur voile ; îlot de navigation en verre (5 boutons ronds de 40 px, l'actif blanc plein avec son libellé) ; colonne d'outils en bas à droite (réinitialiser, +, −, centrer sur le dépôt) ; attribution en verre sombre, largeur bornée.
- **Panneau** : recherche, cloche, bascule de thème ; en-tête d'équipe (E1) ; titre de contexte (300) puis titre de vue (700) ; corps de la vue ; mention RGPD toujours visible en pied.
- **Carte « drone »** : style vectoriel sombre OpenFreeMap retouché à l'exécution (`features/map/basemapStyle.ts`) : satellite désaturé (ADR-007), ombrage du relief (ombres noires, lumières blanc 22 %), aplats d'occupation du sol masqués, routes en blanc 16 %, libellés `#9aa4b2` sur halo sombre ; relief Terrarium exagéré ×1,4 ; ciel et brouillard navy (`sky`) ; voile vertical noir 55 % → 0 → 35 % et vignette radiale. Vue initiale inclinée à 28° sur Nancy et les Vosges.
- **Thèmes** : clair (défaut) et sombre ne changent que les variables `--panel-*` ; préférence mémorisée localement (`localStorage`, sans donnée personnelle).

### 6.1 ter Plein écran et bulle de verre (P4b, lot 1, 07/11/2026)
- **Gabarit** : carte `fixed inset-0` (100dvh) ; bulle à 20 px des bords, largeur `clamp(380px, 38vw, 560px)`, rayon 36 px ; sous 1024 px, feuille à 12 px des bords, 48 % de la hauteur, rayon 28 px. Le bord en S et le cadre sont retirés (ADR-018). Poignée en verre sombre : replier rend toute la carte (variante CSS `panel-collapsed:` pour les outils et l'attribution).
- **Verre** (ADR-019) : deux couches : liseré `--glass-rim` flou (24 px, saturation 1,3) qui porte l'impression de verre, et surface `--glass-bg` qui porte le texte. Opacités retenues : clair blanc 96 % (l'ambre lisible `#b45309` impose ce minimum ; l'encre secondaire seule tolérerait 79 %), sombre `#0f172a` 88 %. Surfaces internes du thème clair passées au gris `--panel` pour se détacher de la bulle blanche (palette inchangée). Test : `tokens.test.ts` compose liseré + surface sur blanc pur et noir pur pour 12 couples encre/thème.
- **Caméra** : `lib/cameraPadding.ts` lit l'emprise de la bulle au moment du mouvement et l'ajoute à la marge de caméra (droite, ou bas pour la feuille) ; utilisé par le recadrage des tournées, des clients, la recherche et la colonne d'outils.
- **Vérifié** : aucun défilement de page à 768, 1280, 1920 px dans les deux thèmes (`e2e/layout.spec.ts`) ; axe 0 violation sur 30 combinaisons (5 écrans × 2 thèmes × 3 largeurs) ; captures `captures/p4b-l1-*.png` (accueil, tournées, panneau replié).

### 6.1 quater Globe d'ouverture et vol (P4b, lot 2, 07/11/2026)
- **Scène** : `store/scene.ts` (`globe` → `flying` → `routes`) ; `features/globe/` : `GlobeDirector` (caméra, boucle unique, vol, retour), `GlobeLayer` (couches natives : arcs, dépôts, anneaux), `GlobeControls` (légende « Réseau de dépôts simulé (démonstration) », pause/lecture, « Passer l'animation »), `globeData.ts` (13 dépôts fictifs, arcs de grand cercle calculés une fois, zoom du globe), `camera.ts` (cadrages globe et Mercator). Réglages : `config/globe.ts`.
- **Esthétique** : imagerie satellite désaturée existante, ciel transparent autour du globe (fond d'espace CSS statique : étoiles, halo solaire ambre en haut à gauche), ombre portée vers le bas à droite (« éclairé par un soleil »), liseré d'atmosphère bleu nuit (`atmosphere-blend`, éteint au-delà du zoom 7), libellés masqués sur le globe. Couleurs : ambre (anneaux, arcs, dépôt principal), blanc, navy : la palette, rien d'autre.
- **Vol** : 4,5 s, ease-in-out cubique, vers l'emprise de l'instance (calcul Mercator, marge de la bulle) ; pins, fiche et pastille n'apparaissent qu'à l'arrivée ; à l'arrivée : projection Mercator, libellés rétablis, puis inclinaison 20° et cap de la vue Tournées (1,2 s) ; annonce `aria-live` « Tournées affichées : 4 camions. ». Un recalcul ne repasse pas par le globe (usage quotidien) ; changer d'instance (tournées effacées) y ramène (zoom arrière 3 s).
- **Animations** : réglage « Animations : complètes / réduites / aucune » (roue crantée de l'en-tête), défaut selon `prefers-reduced-motion`, mémorisé localement. Réduites : globe fixe, saut avec fondu de 150 ms ; aucune : saut sans fondu.
- **Mesures** (`e2e/globe.spec.ts`, Chromium GPU, 1280 px, `docs/perf/globe.json`) : rotation 60.3 images/s du navigateur, aucune tâche longue ; pause : **0 rendu/s** (processeur libre) ; vol : 50.5 images/s, une tâche de 0 ms (chargement des tuiles) ; après l'arrivée : 0 rendu/s ; requêtes hors tuiles : **aucune** ; reduced-motion : 0 rendu/s.
- **Écart mesuré** : la rotation avance par pas de 30/s, mais la carte se redessine ≈ 60 fois/s tant que les anneaux pulsent : chaque `setPaintProperty` relance MapLibre pour plusieurs images (essai : 37 rendus/s sans pulsation, 60 avec, même à 10 changements/s). Accepté : ≤ 60 s, arrêt à la première interaction, 0 ensuite. Le fondu des libellés (`fadeDuration`) a été mis à 0 : il forçait aussi un rendu par image pendant tout mouvement de caméra.
- **Captures** : `captures/p4b-l2-globe-dark-{768,1280,1920}.png`, vol `p4b-l2-vol-{1,2,3}.png`, arrivée `p4b-l2-arrivee-dark-1280.png`, « Passer » `p4b-l2-passer-light-1280.png`, retour `p4b-l2-retour-light-1280.png`.

### 6.1 quinquies Partage des tournées (P4b, lot 3, 07/11/2026)
- **Accès** : bouton « Partager » sous la vitrine du camion sélectionné et en tête de « Arrêts du camion N » (nom accessible « Partager la tournée du camion N »).
- **Dialogue** (`features/share/ShareDialog.tsx`, Dialog de Base UI) : feuille de route (impression), applications de navigation (`ShareNav.tsx` : 3 parties Google Maps pour 25 arrêts, Waze vers l'arrêt suivant à l'heure affichée, confirmation « Les coordonnées de N points seront transmises à … »), fichiers GPX / GeoJSON / CSV et « Partager le GPX… » (Web Share si le navigateur accepte les fichiers, sinon téléchargement), QR code de la première partie (3 étapes, téléphone).
- **Bibliothèque** : `lib/share.ts` (fonctions pures : points, découpage, encodage, GPX 1.1 avec points d'étape + itinéraire + trace allégée à 15 m, GeoJSON, CSV « ; », échappement XML, noms de fichiers) ; `lib/download.ts` (Blob, URL révoquée après 1 s).
- **Vérifié** : 10 tests unitaires (dont GPX analysé par `DOMParser`, échappement de `<3> & "Fils"`) ; `e2e/share.spec.ts` : focus piégé sur 20 tabulations, Échap et retour du focus, GPX téléchargé bien formé (27 points d'itinéraire), nom `cesicdp-camion-1-AAAA-MM-JJ.gpx`, aucun lien tiers sans confirmation, impression = feuille seule (25 lignes, « Résultat simulé ») ; axe 0 violation (2 thèmes × 2 largeurs). Captures `captures/p4b-l3-*.png`.

### 6.1 sexies Camion du panneau (P4b, lot 4, 07/11/2026)
- **Rôle** : le camion de la vitrine est le camion **sélectionné, au dépôt**. Parti, sa baie montre un contour en pointillés et « Camion N · en tournée, retour prévu HH:MM » (heure de retour du résultat). Au dépôt, « Camion N au dépôt. » reste lisible par les lecteurs d'écran.
- **Code** : `config/cameo.ts` (toutes les durées et seuils), `features/cameo/cameoMachine.ts` (machine pure : états `home / leaving / away / entering`, file d'étapes), `useCameo.ts` (déclencheurs, lecteur WAAPI), `flight.ts` (trajet en courbe vers le coin supérieur droit du panneau puis hors écran ; images clés `transform` échantillonnées par `getPointAtLength`, rotation selon la tangente, réduction à 72 %, disparition en fin de course), `PanelTruck.tsx` (baie + couche animée en portail, `aria-hidden`, sans pointeur), `bus.ts` (`notifySimulation(true|false)` pour P5, « Rejouer »).
- **Déclencheurs** : T1 changement de camion (sortie puis entrée ; clics rapides fusionnés) ; T2 / T3 début / fin de simulation (évènements prêts et testés, **câblage en P5**) ; T4 première apparition des tournées (entrée une seule fois par résultat) ; T5 après 120 s sans interaction, jamais pendant un calcul ni une simulation, au plus un par 10 min, absence de 20 s ; « Rejouer l'animation du camion » dans les réglages (roue crantée). Entrée : le camion **recule** dans sa baie (cabine vers l'extérieur, comme à quai), freinage final et tassement de 260 ms. Lueur des phares ambre, traînée en pointillés qui s'efface.
- **Niveaux** : complètes = trajet ; réduites = fondu de 200 ms sur place, pas de T5 ; aucune = changement d'état sans mouvement. Onglet caché : aucune animation.
- **Vérifié** : 6 tests de la machine avec horloge simulée (T1–T5, file, délais, rejouer) ; `e2e/cameo.spec.ts` à 1280 et 768 px : **0 tâche longue, décalage de mise en page 0** pendant la sortie et l'entrée (`docs/perf/cameo-*.json`), un clic sous le trajet aboutit pendant l'animation ; captures `captures/p4b-l4-*.png`.
- **Limite** : un changement de camion pendant une simulation (P5) fera rentrer le nouveau camion ; à trancher au câblage de T2/T3.

### 6.1 bis Analyse d'écart avec la maquette de référence (07/11/2026) et corrections

| Élément | Maquette « Roam » | Avant | Après |
|---|---|---|---|
| Accent | une couleur vive, état actif et parcouru seulement | ambre, mais redéfini en gris par shadcn | ambre (palette inchangée), réservé à la sélection, au parcouru, aux badges et au curseur ; le dépôt n'est plus ambre |
| Caméra | quasi verticale (0–25°), trajet qui monte | 28°, nord en haut | 20° ; à la sélection, carte tournée pour que le trajet monte |
| Traitement | satellite sombre, nuages aux bords, vignette forte | vignette légère | nappes nuageuses aux bords, voile haut renforcé, vignette forte ; pistes d'aéroport et pointillés ferroviaires noirs masqués |
| Trajet | parcouru jaune plein / à venir blanc pointillé sur contour | aucun tracé | deux états, coupés à l'heure affichée ; autres camions blanc 45 % |
| Curseur | flèche dans un halo de verre, cône de visée | absent | flèche ambre, halo de verre, cône orienté selon le cap du trajet |
| Pins | verre sombre 36 px, icône blanche, petit badge ; actif blanc | points natifs | pins de verre 36 px, badge 18 px (ordre de passage), actif blanc plein ; points natifs sous les libellés |
| Contrôles | 5 ronds détachés, l'actif blanc ; outils en colonne | capsule avec libellé | ronds détachés de 40 px ; outils 36 px ; marges de 24 px ; icônes à trait 1,5 px |
| Titre | grand et léger, ligne de détail à 60 % | marque en gras | « Tournées du jour » (300) + « NANCY-60 · 60 clients · 4 camions » à 60 % |
| Carte d'info | blanche, rayon 28, coin concave, ✕ accroché, profil | absente | identique (masque radial), profil d'altitude lu dans le relief |
| Panneau | véhicule détouré qui déborde sur la carte du dessous | formulaires seulement | camion dessiné en SVG qui chevauche la carte de tournée sélectionnée |
| Cartes de trajets | noires, texture de rues, onglet découpé, ligne dorée fine | absentes | identiques, sans onglet ni chevauchement (07/11 : le masque de l'onglet coupait le contour de sélection et mordait la carte voisine) |
| Accrocs corrigés | — | en-tête d'équipe sur 25 % du panneau ; recherche et cloche sans effet ; capacités qui passaient à la ligne de façon inégale ; attribution blanche massive | en-tête sur une ligne ; recherche de client (combobox) ; alertes ; capacités alignées en grille ; attribution repliée |

La typographie reste **Inter** (CLAUDE.md §4 l'autorise ; une police plus arrondie demanderait une nouvelle dépendance et un ADR). La hiérarchie repose sur trois graisses : 300 pour les titres de contexte, 600 pour les titres de contenu, 800 pour les chiffres clés.

### 6.2 Jetons

Principe : un seul accent de marque (rose `#f471b5`, ADR-023 ; ambre jusqu'au 07/11/2026), du noir/navy et du blanc ; la couleur porte un sens, jamais un décor. Source unique : `src/styles/tokens.css`, exposée à Tailwind par `@theme inline` (`src/styles/index.css`). Le thème ne change que les variables `--panel-*` ; la carte reste sombre.

Ratios recalculés par `src/lib/contrast.ts` (formule WCAG 2.1) et vérifiés par `src/styles/tokens.test.ts` à chaque `npm test` :

| Premier plan / fond | Ratio | Usage | AA |
|---|---|---|---|
| `--muted-text` / `--bg` | 3,83 | décor, grand texte seulement | ✗ texte courant |
| `--muted-text-aa` / `--bg` | 7,08 | texte secondaire sombre | ✓ |
| `--muted-text-aa` / `--muted-bg` | 5,80 | texte sur pastille sombre | ✓ |
| `--on-dark` / `--bg` | 16,30 | texte principal sombre | ✓ |
| `--on-dark` / `--journey-card` | 13,05 | cartes de tournée | ✓ |
| `--muted-text-aa` / `--journey-card` | 5,67 | secondaire des cartes de tournée | ✓ |
| `--on-accent` / `--accent` | 7,57 | texte sur le rose | ✓ |
| `--accent-ink` / `--card` | 6,04 | rose lisible sur blanc | ✓ |
| `--accent-ink` / `--panel` | 5,43 | rose lisible sur panneau | ✓ |
| `--accent` / `--card` | 2,67 | interdit en texte sur clair | ✗ |
| `--ink` / `--panel` | 16,05 | texte principal clair | ✓ |
| `--ink-2` / `--panel` | 6,81 | texte secondaire clair | ✓ |
| `--ink-2` / `--card` | 7,58 | secondaire des cartes | ✓ |
| `--accent` / `--bg` · `--muted-bg` · `--bg-darker` | 6,70 · 5,49 · 7,07 | rose sur sombre, tracé actif sur la carte | ✓ |
| `--ok` / `--wait` / `--late` sur `--bg` | 9,29 / 8,34 / 5,98 | statuts (toujours icône + libellé) ; retard = indigo | ✓ |
| `--late` / `--muted-bg` · `--late-ink` / `--card` · `--panel` | 4,90 · 6,29 · 5,65 | retard (indigo) sur surface sombre et sur clair | ✓ |
| `--series-2` / `--bg` | 5,98 | seconde série des graphiques | ✓ |

Autres jetons : rayons (`--radius-frame` 36 px, `--radius-card` 24 px, `--radius-journey` 16 px), gabarit (`--frame-max` 1536 px, `--split-map` 62 %, `--s-curve` 40 px), verre (`--glass-bg` noir 45 %, `--glass-border` blanc 15 %, flou 24 px), palette optionnelle « colorier par camion » `--route-1…8` (schéma « light » de Paul Tol, conçu pour les daltonismes ; désactivée par défaut). Typographie : Inter Variable auto-hébergée (`@fontsource-variable/inter`), taille minimale 12 px, vérifiée par un test qui refuse toute taille inférieure dans `src/`.

## 7. Accessibilité

Cible WCAG 2.1 AA.
- **P0** : contrastes des jetons vérifiés automatiquement, focus toujours visible (anneau ambre doublé d'un liseré sombre), `prefers-reduced-motion` coupe animations et transitions, règles `jsx-a11y` dans le lint, aucune taille de texte < 12 px.
- **Refonte UX** : pins = vrais boutons nommés (« Arrêt 3 : Client 12 — Gérardmer, arrivée 10:42, à l'heure ») ; cartes de tournées dont le nom accessible contient le texte visible (WCAG 2.5.3, détecté par axe) ; recherche de client en combobox ARIA (flèches, Entrée, Échap) ; cloche avec nombre d'alertes et panneau refermable par Échap ; liste des arrêts = équivalent texte de la carte ; axe : 0 violation sur 5 états (accueil, Données, Contraintes, Calcul, tournées calculées) × 2 thèmes × 2 largeurs.
- **P3** : interrupteurs natifs `role="switch"` reliés à leur libellé et à leur description ; choix d'algorithme en groupe de boutons radio (`fieldset`) ; capacités « pris en compte / non pris en compte » en icône + texte ; alerte FIFO et contraintes ignorées annoncées (`role="alert"` / `role="status"`) ; barre de progression `role="progressbar"` ; état du calcul dans une région `aria-live` ; graphiques décrits par un libellé textuel (dernière valeur) et doublés d'un tableau. axe : 0 violation sur les vues Données, Contraintes et Calcul (2 thèmes × 2 largeurs).
- **P2** : formulaires étiquetés (`label` relié), erreurs reliées par `aria-describedby` et `aria-invalid` ; table : vrai `<table>`, `aria-rowcount` / `aria-rowindex` malgré la virtualisation, tri par boutons dans les en-têtes avec `aria-sort`, chaque cellule éditable nommée (« Demande — Client 12 »), erreur de cellule annoncée (`role="alert"`) ; statut de fenêtre en icône + libellé ; rapport d'import dans une région `aria-live`. axe : 0 violation sur la vue Données (2 thèmes × 2 largeurs). Nouveaux jetons `--late-ink`, `--ok-ink`, `--wait-ink` pour les états sur fond clair (`--late` sur blanc n'atteint pas 3:1).
- **P1** : audit axe (règles WCAG 2.0/2.1 A et AA) de la coque : **0 violation** en thème clair et sombre, à 1280 et 768 px (`npm run test:a11y`). Le canevas WebGL est exclu de l'audit (axe ne peut pas lire ses pixels) : les textes posés dessus sont vérifiés sur capture (blanc et `#9aa4b2` sur voile noir). Lien d'évitement « Aller au panneau de travail » ; régions nommées (carte, navigation, panneau, outils) ; `aria-current` sur la vue active ; `aria-expanded` sur la poignée ; `aria-busy` sur la carte pendant le chargement ; boutons-icônes nommés (`aria-label` exigé par le typage de `IconButton`) ; textes internes de MapLibre traduits (`locale`), dont les raccourcis clavier de la carte ; caméra instantanée si `prefers-reduced-motion`.
- **À venir** : alternative textuelle complète à la carte (liste des arrêts, P4).

## 8. Protection des données (RGPD)

- Les fichiers importés sont traités **dans le navigateur** (Web Worker) ; aucun appel réseau ne contient de données clients.
- Aucune image hébergée chez un tiers (police auto-hébergée, pas d'avatar distant).
- **Les requêtes de tuiles révèlent la zone consultée** : chaque tuile demandée (style OpenFreeMap, relief AWS, satellite EOX) contient ses coordonnées x/y/z. Un serveur de tuiles peut donc déduire la région affichée, jamais la liste des clients, qui sont dessinés localement. Parade possible : héberger les tuiles soi-même (PMTiles).
- Données de démonstration exclusivement fictives.
- **Partage d'une tournée** (ADR-021) : fichiers générés dans le navigateur ; un lien Google Maps ou Waze contient les coordonnées des arrêts : il n'est ouvert qu'après un avertissement nommant le service et le nombre de points ; le QR code ne transmet rien par lui-même.

## 9. Tests et qualité

| Commande | Contenu |
|---|---|
| `npm run typecheck` | TypeScript strict, `noUncheckedIndexedAccess` |
| `npm run lint` | oxlint : correctness en erreur, `no-explicit-any`, `ban-ts-comment`, jsx-a11y, `import/no-cycle` |
| `npm test` | Vitest : contrastes des jetons, taille de texte minimale, en-tête d'équipe, poignée du panneau, îlot de navigation (24 tests en P1) |
| `npm run test:a11y` | axe sur la vue Données (coque comprise), 2 thèmes × 2 largeurs |
| `e2e/journey.spec.ts` | parcours principal : 1 clic de l'ouverture aux tournées affichées (tracé, pins, carte d'info), sans défilement horizontal, 2 thèmes × 2 largeurs |
| `e2e/run.spec.ts` | critère P3 : « non pris en compte » avant et après calcul, convergence en direct, annulation sans résultat, PLNE refusé en mode simulé ; éditeur de trafic : l'alerte FIFO disparaît quand les coefficients ne baissent plus |
| `npm run test:perf` | build de production : import CSV de 1000 lignes (3 erreurs), tâches longues du fil principal (`docs/perf/import-1000.json`) |

Mesure P2 (build de production, poste de §5) : analyse 16 ms dans le worker ; 184 à 331 ms entre le choix du fichier et l'affichage du rapport ; **0 tâche longue (> 50 ms)**. En serveur de développement, une image de ≈ 120 ms apparaît : le profil CPU (protocole CDP) l'attribue au recalcul du relief par MapLibre lors du recadrage de la carte et à React en mode développement, pas à l'import.
| `npm run shots` | captures à 1280 et 768 px + contrôle de l'absence de défilement horizontal |
| `npm run spikes` | essais S1–S3 |
| `npm run build` | vérification de types puis build Vite |

## 10. Contrat de données

Source unique : `src/types/vrp.ts` (schémas Zod, types déduits). Fiche destinée à l'équipe solveur : `docs/CONTRAT_SOLVEUR.md`.

| Objet | Champs | Remarques |
|---|---|---|
| `Instance` | `id, name, depot, customers[], fleet, traffic, options, meta` | contrôles croisés : coordonnées géographiques si `meta.coordinates = "geo"`, identifiants uniques |
| `Customer` | `id ≥ 1, name, lat, lng, demand ≥ 0, tw: {a ≤ b} \| null, service ≥ 0` | temps en minutes |
| `Depot` | `name, lat, lng, tw` | horaires d'ouverture |
| `Fleet` | `k ≥ 1, Q > 0, fixedCost ≥ 0, baseSpeedKmh` | flotte homogène |
| `Traffic` | `slots[]: {from, to, factor ≥ 1}` | contiguës, 00:00 → 24:00 |
| `Options` | `timeWindows: off \| strict, allowWait` | |
| `SolveRequest` | `instance, algo: sa \| clarke-wright \| milp, params` | `params` = réglages de `resoudre()` (`durationS, seed, K, t0, t1, moveProbas[], kMax?`) |
| `SolveResult` | `cost, costInitial, objective, valid, message, iterations, bks?, gap?, routes[], history[], comparison, ignoredConstraints[]` | `objective` toujours affiché près d'un écart |
| `Route` | `vehicleId, load, distanceM?, geometry?, start?, end?, stops[], legs[]` | `?` = `null` si non fourni |
| `Stop` | `customerId, arrival?, wait?, departure?, late?` | jamais recalculé par l'interface |
| `Leg` | `from, to, departure, travelMin, distanceM, factor` | `factor` = tranche de trafic appliquée (vitesse en simulation) |

Écart relevé avec CLAUDE.md : `recuit_simple.py` utilise **4** mouvements (`déplacer`, `échanger`, `2-opt`, `2-opt*`, probabilités par défaut 0,4 / 0,2 / 0,2 / 0,2), et non 7 ; `moveProbas` est donc un tableau de longueur libre, dans l'ordre du solveur.

**Formats d'import** : CSV (`;` ou `,`, en-têtes `id, nom, lat, lng, demande, debut, fin, service` ou équivalents anglais, heures « 08:30 », « 8h30 » ou minutes), JSON (instance complète ou tableau de clients), VRPLIB `.vrp` (EUC_2D, comme le solveur ; dépôt renuméroté 0), Solomon / Gehring-Homberger `.txt` (client 0 = dépôt). Un CSV ou un tableau JSON remplace les clients et conserve dépôt, flotte et trafic.

## 11. Limites connues

- Les éléments « verre » ne sont pas masqués par le relief (ADR-004).
- Mesures de performance faites sur un seul poste ; à refaire sur le matériel de soutenance.
- MapLibre épinglé en 5.24 tant que deck.gl n'est pas compatible avec la 6.x (ADR-002).
- Facteur CO₂ de 0,29 kg/km repris du prototype : **source à fournir par l'équipe**.
- Sous 1024 px, l'attribution de la carte est repliée derrière son bouton « i » (dépliée, elle masquerait un quart de la carte) ; elle est dépliée au-dessus.
- Le profil Mapbox de `config/basemap.ts` n'est pas opérationnel avec MapLibre (URL `mapbox://`) : décision ouverte (SUIVI).
- Imagerie satellite de 2016 (ADR-007).
- Résultat de NANCY-60 simulé, fenêtres non respectées par construction (ADR-011).
- Instances à coordonnées planes (VRPLIB, Solomon) : pas d'affichage cartographique.
- Table clients : 9 colonnes dans le panneau (38 %) → défilement horizontal interne.
- Modèle de trafic illustré (temps × coefficient de la tranche de départ) non confirmé par l'équipe solveur (ADR-012).
- Gantt : le premier survol coûte ≈ 320 ms (une fois) ; pendant un geste de zoom, l'axe et les étiquettes ne suivent qu'au relâchement ; les barres ne sont pas atteignables au clavier une à une (la liste des arrêts l'est).
- Carte tournée à la sélection d'un camion : le nord n'est plus en haut (choix de la maquette) ; « Réinitialiser la vue » le rétablit.
- Position du camion entre deux arrêts interpolée à vitesse constante le long du tracé (affichage seulement, ADR-003 / `lib/route.ts`).
- Courbe de convergence simulée en mode mock ; capacités des algorithmes déclarées en dur (`config/solver.ts`) tant que l'API ne les fournit pas.

## 12. Glossaire

- **CVRPTW** : problème de tournées de véhicules avec capacité (*C*) et fenêtres de temps (*TW*).
- **Fenêtre** `[a_i, b_i]` : intervalle pendant lequel le client *i* peut être servi ; arrivée avant `a_i` = attente, après `b_i` = retard (interdit si fenêtres strictes).
- **Tranche de trafic** : intervalle horaire de coefficient `d^t ≥ 1` qui multiplie le temps de parcours.
- **Propriété FIFO** : partir plus tard ne fait jamais arriver plus tôt.
- **BKS** : meilleure solution connue d'une instance de référence ; **gap** = 100 × (coût − BKS) / BKS.
- **Drapé** : se dit d'une couche cartographique qui épouse le relief.
- **Essai (spike)** : expérience courte, mesurée, destinée à valider un choix technique.

## 13. Script de démonstration

*Version P4b (complétée en phase 6).* Durée ≈ 4 min ; réglage « Animations : complètes » ; écran ≥ 1280 px.

1. **Globe** (0:00) : l'application s'ouvre sur le globe qui tourne. « Voici un réseau de dépôts **simulé** — c'est écrit à l'écran. » Montrer le bouton pause (accessibilité : tout mouvement automatique a une pause).
2. **Calcul** (0:30) : un clic sur « Calculer les tournées ». Montrer la ligne « fenêtres et trafic non pris en compte par cet algorithme » : l'interface ne ment pas sur le solveur.
3. **Zoom** (0:50) : vol de 4,5 s du globe aux tournées ; à l'arrivée, inclinaison « drone », tracé ambre parcouru / blanc à venir, fiche du camion. Mentionner « Passer l'animation » et Échap.
4. **Lecture** (1:30) : cartes de tournées, indicateurs, planning (Gantt : fenêtres, attente hachurée, retard ▼), curseur d'heure.
5. **Partage** (2:30) : « Partager » → feuille de route (aperçu d'impression), GPX ; cliquer Google Maps pour montrer l'avertissement RGPD, puis Annuler ; QR code pour le téléphone du chauffeur.
6. **Camion** (3:15) : choisir un autre camion : l'ancien quitte le panneau par le coin, le nouveau recule dans sa baie. En secours : réglages → « Rejouer l'animation du camion ».
7. **Conclusion** (3:45) : thème sombre, largeur tablette (feuille du bas), « tout ce que montre la carte est aussi dans la liste des arrêts ».

## 14. Questions probables du jury

1. *Pourquoi MapLibre et pas Mapbox ?* — Gratuit, sans compte ni carte bancaire, API compatible ; Mapbox reste activable par `VITE_BASEMAP=mapbox` (un seul fichier, `config/basemap.ts`).
2. *Pourquoi une version ancienne de MapLibre ?* — deck.gl 9.4 plante avec MapLibre 6 quand le relief est actif ; constaté en essai, documenté (ADR-002).
3. *Comment savez-vous que vos couleurs sont accessibles ?* — Chaque paire est recalculée par un test automatique (formule WCAG 2.1) ; la suite de tests échoue si une paire passe sous son seuil.
4. *Vos images/s sont-elles crédibles ?* — Mesurées dans Chromium avec accélération GPU ; le nom du moteur WebGL est enregistré avec chaque mesure ; protocole et données brutes en §5.
5. *Pourquoi la carte reste-t-elle sombre en thème clair ?* — Le tracé ambre et les statuts sont conçus pour un fond sombre (contrastes de 6,7 à 9,3:1) ; sur fond clair, l'ambre tomberait à 2,15:1.
11. *Combien de clics pour obtenir les tournées ?* — Un : « Calculer les tournées » sur l'écran d'accueil ; l'application montre ensuite les tournées sans autre action (test automatisé).
12. *Le camion affiché sur la carte, d'où vient sa position ?* — Des horaires du solveur (départ, arrivées, départs) ; entre deux arrêts, on l'interpole le long du tracé. Sans horaire, aucun curseur n'est affiché.
9. *Votre recuit gère-t-il les fenêtres de temps ?* — Pas encore : l'interface l'affiche (« Fenêtres : non pris en compte ») avant le lancement et sur le résultat ; seul le PLNE les traite aujourd'hui.
10. *Qu'est-ce que la propriété FIFO et pourquoi l'alerte ?* — Partir plus tard ne doit jamais faire arriver plus tôt. Avec un coefficient appliqué à tout le trajet selon l'heure de départ, une baisse de coefficient la viole ; l'éditeur le détecte et chiffre l'exemple.
7. *Pourquoi ne pas appeler OSRM depuis l'interface ?* — Chaque requête contiendrait les coordonnées des clients (donnée potentiellement personnelle) ; les tracés viennent du solveur, et en démonstration ils ont été calculés une fois, sur des points fictifs.
8. *Comment prouvez-vous que l'import ne bloque pas l'interface ?* — Test automatisé sur le build de production : un `PerformanceObserver` compte les tâches longues pendant l'import de 1000 lignes ; résultat 0 (§9).
6. *Et au clavier, sur la carte ?* — Flèches, + et −, Maj + flèches pour incliner et tourner (MapLibre) ; un lien d'évitement mène directement au panneau ; toute l'information de la carte sera aussi dans la liste des arrêts (P4).

13. *Pourquoi un globe à l'ouverture ?* — Il dit en une image que l'outil passe de l'échelle d'un réseau à celle d'une tournée ; il est natif (MapLibre, aucune bibliothèque 3D), étiqueté « démonstration », s'arrête à la première interaction ou après 60 s, et disparaît si l'on demande moins d'animations.
14. *Le partage envoie-t-il les données des clients à Google ?* — Non par défaut : les fichiers sont produits dans le navigateur ; un lien Google Maps ou Waze n'est ouvert qu'après un avertissement qui nomme le service et le nombre de points transmis.
15. *Combien coûte l'animation du camion ?* — Une mise en place de 23–33 ms, puis rien sur le fil principal : 36 animations `transform`/`opacity` jouées par le compositeur (S5, S6 : 0 échec de composition) ; mesuré : 0 tâche longue, décalage de mise en page 0, 60 images/s ; aucune boucle continue ; rien si le camion n'est pas visible ou si l'onglet est caché.
19. *Votre camion est-il physiquement plausible ?* — Le point suivi est l'essieu arrière ; le virage est une clothoïde de rayon empattement / tan 40° ; la vitesse est planifiée sous des limites d'accélération longitudinale et latérale ; roulis, tangage, braquage, rotation des roues, ombre et éclairage découlent de ces grandeurs ; la perspective vient d'une caméra fixe. Seul le temps est accéléré (≈ ×3), avec des rapports réalistes (marche arrière ≈ 0,4 × marche avant).
16. *Pourquoi Google Maps en plusieurs parties ?* — La documentation limite un lien à 9 étapes intermédiaires (3 sur navigateur mobile) ; au-delà, l'itinéraire est tronqué. Waze ne prend qu'une destination : on propose l'arrêt suivant ; Apple Plans n'a pas de format multi-étapes documenté : on fournit le GPX.
17. *Un panneau transparent reste-t-il lisible ?* — L'opacité est la plus faible qui garde 4,5:1 pour chaque texte, calculée en composant le verre sur blanc pur et sur noir pur (test automatique) ; si le système demande moins de transparence, le panneau devient opaque.
18. *Que devient le globe pendant l'usage quotidien ?* — Il n'apparaît que sans tournée ; un recalcul ne repasse pas par le globe ; la rotation est arrêtée par la première interaction ; mesuré : 0 rendu de carte par seconde une fois arrêté.

*(Liste complétée en phase 6.)*

## Annexe A. Versions et licences

| Élément | Version | Licence / conditions |
|---|---|---|
| React / React DOM | 19.2 | MIT |
| Vite | 8.3 | MIT |
| TypeScript | 7.0 | Apache-2.0 |
| Tailwind CSS | 4.3 | MIT |
| MapLibre GL JS | 5.24 | BSD-3-Clause |
| react-map-gl | 8.1 | MIT |
| deck.gl | 9.4 | MIT |
| Zod / Zustand / TanStack / Recharts / d3-scale | 4.6 / 5.1 / 9.3 + 3.14 / 3.10 / 4.0 | MIT / MIT / MIT / MIT / ISC |
| Inter Variable | 5.3 (@fontsource) | SIL Open Font License 1.1 |
| Style OpenFreeMap « dark » | — | données © OpenStreetMap (ODbL), schéma OpenMapTiles ; attribution affichée |
| Relief Terrarium (AWS Open Data) | — | données libres, attribution « Mapzen Terrain Tiles » affichée |
| Sentinel-2 cloudless 2016 (EOX IT Services) | — | CC BY 4.0 ; contient des données Copernicus Sentinel modifiées ; attribution affichée |
| lucide-react (icônes) | 1.66 | ISC |
| shadcn/ui (`cn`, Base UI, class-variance-authority), motion | 4.23 / 1.9 / 0.7 / 14.10 | MIT |
| Magic UI `BorderBeam` (copié) | — | MIT (ADR-015) |
| uqr (encodage de QR code) | 0.1.3 | MIT, sans dépendance (ADR-021) |
| OSRM (serveur de démonstration) | — | 5 requêtes uniques sur points fictifs (ADR-011) ; données routières © OpenStreetMap (ODbL) |
