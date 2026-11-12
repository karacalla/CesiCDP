---
name: cesicdp-frontend
description: Plan du code, recettes et pièges du frontend React/TS CesiCDP (dispatcher CVRPTW, MapLibre + deck.gl). À charger avant toute modification dans site/.
---

# Frontend CesiCDP — carte du code

Lire d'abord `docs/SUIVI.md` (état, prochaine action), puis ce fichier. Règles et identité : `CLAUDE.md`. Justifications : `docs/DOSSIER_CONCEPTION.md`.

## Plan du code (qui fait quoi)

```
site/
├─ index.html                 entrée unique de l'app (les essais ont leurs propres .html)
├─ vite.config.ts             Vite + Vitest + alias @/ → src/
├─ playwright.config.ts       Chromium avec GPU (ANGLE D3D11), serveur Vite sur :5199
├─ src/
│  ├─ main.tsx / App.tsx      montage React ; App = MapProvider + AppFrame(carte, panneau)
│  ├─ app/views.ts            5 vues (id, libellé, icône) de l'îlot de navigation
│  ├─ styles/tokens.css       SOURCE UNIQUE des couleurs, rayons, gabarits ; thème = variables --panel-*
│  ├─ styles/index.css        Tailwind + @theme inline (expose les jetons : bg-accent, text-panel-ink…)
│  ├─ styles/tokens.test.ts   contrastes WCAG des paires + interdiction des textes < 12 px
│  ├─ config/basemap.ts       style de carte, relief, exagération (MapLibre par défaut / Mapbox)
│  ├─ config/team.ts          membres du groupe (noms null = à compléter par l'équipe, ne jamais inventer)
│  ├─ config/app.ts           vue initiale, vue dépôt, inclinaison max, durée caméra
│  ├─ i18n/fr.ts              tous les textes d'interface
│  ├─ lib/contrast.ts         ratio WCAG 2.1
│  ├─ lib/random.ts           mulberry32 (graine) : seul générateur autorisé pour les données
│  ├─ lib/team.ts             initiales et libellés des membres (« Membre n — à compléter »)
│  ├─ store/ui.ts             Zustand : vue active, thème (localStorage), panneau replié
│  ├─ hooks/                  useThemeAttribute (data-theme sur <html>), usePrefersReducedMotion
│  ├─ types/vrp.ts            CONTRAT (Zod → types) ; fiche équipe solveur : docs/CONTRAT_SOLVEUR.md
│  ├─ services/               api.ts (façade, VITE_API_MODE), types.ts, mockApi.ts, httpApi.ts,
│  │                          adapters.ts (+ test : noms Python → TS, horaires null si absents)
│  ├─ data/                   nancy-60.instance.json / .result.json (générés UNE fois), gen1000.ts (graine)
│  ├─ lib/parsers/            csv, json (index), vrplib, solomon → ImportResult {customers, issues[ligne]}
│  ├─ lib/validation.ts       validateCustomer (messages fr), twStatus ; lib/time.ts (HH:MM ↔ minutes)
│  ├─ store/vrp.ts            instance courante, CRUD toujours valide, rapport d'import
│  ├─ workers/import.worker.ts  parseFile hors du fil principal
│  ├─ features/data/          DataView, InstancePicker, ImportPanel(+useImport), DepotForm, FleetForm,
│  │                          CustomerTable(+useCustomerTable, EditableCell, StatusBadge), useDraft
│  ├─ config/solver.ts        ALGOS + capacités (seul milp traite fenêtres/trafic), MOVE_NAMES, DEFAULT_PARAMS
│  ├─ lib/traffic.ts          illustration du modèle de trafic : fifoViolations, travelTimeSteps
│  ├─ lib/constraints.ts      activeConstraints, ignoredBy(algo, instance) → « non pris en compte »
│  ├─ services/mockRun.ts     calcul simulé (refuse tout sauf recuit sur NANCY-60 intacte) ; httpApi.solve = POST + sondage
│  ├─ store/run.ts            réglages, progression, résultat, annulation (un calcul à la fois)
│  ├─ hooks/useChartColors.ts couleurs de graphique lues dans les jetons (--chart-1/2, --panel-*)
│  ├─ features/constraints/   ConstraintsView, TrafficEditor (clé = tranches), TravelTimeChart
│  ├─ features/run/           RunView, AlgoPicker, SaParams, ConvergenceCharts
│  ├─ features/tours/         VUE D'ACCUEIL : ToursView, RunHero (1 clic), JourneyCard, TruckShowcase,
│  │                          RoutesLayer (2 états), MapMarkers (pins verre + curseur), InfoCard, StatusPill,
│  │                          useTours (données dérivées), useProjected (HTML positionné), useElevationProfile
│  │                          gantt/ : Gantt, GanttRows (memo), GanttTooltip, useGanttZoom, ganttScale (+test)
│  ├─ lib/cameraPadding.ts    marge de caméra = place de la bulle (TOUT flyTo/fitBounds/easeTo passe par visiblePadding)
│  ├─ lib/share.ts            partage pur (Google découpé, Waze, GPX, GeoJSON, CSV, noms) ; lib/download.ts (Blob)
│  ├─ features/share/         ShareDialog (Base UI Dialog), ShareNav (confirmation tiers), RouteSheet (impression), QrCode
│  ├─ features/cameo/         camion du panneau : cameoMachine (pure), motion (physique, pure), keyframes, useCameo (WAAPI), PanelTruck, bus ; features/truck3d/ : modèle 3D CSS
│  ├─ config/cameo.ts         durées et seuils du camion (T5 : 120 s, 10 min, 20 s)
│  ├─ lib/route.ts            géométrie d'affichage : buildTrack, stateAt(heure), splitAt, bearing
│  ├─ store/scene.ts          phase de la carte globe → flying → routes, rotation, « passer », annonce
│  ├─ features/globe/         GlobeDirector (caméra + boucle unique), GlobeLayer, GlobeControls, globeData, camera
│  ├─ config/globe.ts         réglages du globe et dépôts FICTIFS ; hooks/useMotionLevel (full/reduced/none)
│  ├─ store/selection.ts      camion / arrêt sélectionnés, heure affichée (DEMO_CLOCK)
│  ├─ components/shadcn/      composants shadcn (alias de components.json ; vide depuis le 12/11) ; components/fx/ : effets (BorderBeam)
│  ├─ components/layout/      + CustomerSearch (combobox), AlertsButton
│  ├─ features/map/CustomersLayer.tsx  clients + dépôt (couches natives, regroupement > 300)
│  ├─ components/ui/          IconButton (aria-label obligatoire ; variantes glass / panel / solid)
│  ├─ components/layout/      AppFrame (plein écran + bulle de verre / feuille du bas + poignée), NavIsland,
│  │                          PanelHeader, TeamHeader (E1), PrivacyNotice (RGPD)
│  ├─ features/map/           MapStage (carte, relief, ciel, voile), basemapStyle (retouche « drone »),
│  │                          MapOverlay (marque + îlot + outils), MapToolbar
│  ├─ features/panel/         PanelContent (en-tête, titre de vue, corps, RGPD)
│  ├─ features/<vue>/         (P2+) data, constraints, run, results, simulation, study
│  ├─ workers/
│  └─ test/setup.ts           jest-dom pour Vitest
├─ scripts/make-nancy60.ts    génération unique de NANCY-60 (OSRM, points fictifs) : NE PAS relancer sans raison
├─ spikes/                    essais S1–S3, mesure du Gantt réel (gantt.tsx) ; servis en dev seulement
├─ e2e/                       Playwright : helpers.ts (openApp), screenshots.spec.ts, a11y.spec.ts, spikes.spec.ts
└─ docs/                      SUIVI.md, DOSSIER_CONCEPTION.md, captures/, spikes/resultats.json
```

## Commandes

`npm run check` (= typecheck && lint && test && build) · `npm run test:perf` (build prod, import 1000) · `npm run shots` (captures 1280/768, `SHOTS_PHASE=p1` pour nommer) · `npm run spikes` · `npm run test:a11y`.

## Recettes

**Ajouter un jeton de couleur**
1. Le déclarer dans `src/styles/tokens.css` (`:root`, et `:root[data-theme='dark']` s'il dépend du thème).
2. L'exposer dans `@theme inline` de `src/styles/index.css` (`--color-x: var(--x)`).
3. S'il porte du texte : ajouter la paire dans `PAIRS` de `tokens.test.ts` (seuil 4,5 ou 3) ; reporter le ratio au dossier §6.

**Ajouter une vue**
1. Dossier `src/features/<vue>/` ; composant de présentation pur + hook `use<Vue>()` pour la logique.
2. Textes dans `i18n/fr.ts`. Entrée dans l'îlot de navigation (P1).
3. Ajouter la vue à `VIEWS` dans `e2e/screenshots.spec.ts` et à l'audit axe ; regarder les captures avant de dire « fini ».

**Ajouter un type au contrat**
1. `src/types/vrp.ts` + schéma Zod correspondant ; traduction dans `services/adapters.ts` si le solveur nomme autrement.
2. Mettre à jour le dossier §10 et prévenir l'équipe backend.

**Ajouter une dépendance** : ADR au dossier §4 **avant** l'installation.

## Pièges connus

- **MapLibre 6 + deck.gl 9.4 + relief = plantage** (`reading 'elevation'`). MapLibre reste en `~5.24.0` (ADR-002). Ne pas mettre à jour sans relancer `npm run spikes`.
- **deck.gl ne suit pas le relief** : à z = 0 les couches passent sous le terrain. Tracés et pins en couches natives ; pour le camion, `z = map.queryTerrainElevation(p)` (valeur déjà multipliée par l'exagération).
- **Ne jamais utiliser `maplibregl.Marker` ni `<Marker>` de react-map-gl** avec le relief : 40 marqueurs = 10 images/s. Positionner soi-même les éléments HTML (`map.project` dans l'événement `render`).
- **Gantt** : pas de re-rendu React pendant un zoom ou un défilement ; `transform` SVG puis re-rendu au relâchement (ADR-005). La molette seule doit faire défiler le panneau : zoom = Ctrl/⌘ + molette (écouteur non passif).
- **Captures Playwright sous Windows** : `UNKNOWN: unknown error, open …png` = fichier verrouillé (aperçu ouvert) ; relancer le test.
- **`map.once('idle')` ne revient pas** si la carte est déjà inactive et que rien ne déclenche de rendu : appeler `map.triggerRepaint()` après avoir posé l'écouteur.
- **Import de MapLibre** : `import * as maplibregl from 'maplibre-gl'` (pas d'export par défaut dans les types).
- **Vite garde l'ancienne version d'une dépendance en cache** après un changement de version : arrêter le serveur sur :5199 et relancer avec `--force`.
- **Git Bash convertit `/chemin` en `C:/Program Files/Git/chemin`** dans les arguments : préfixer par `MSYS_NO_PATHCONV=1`.
- Rose `--accent` (marque, ADR-023) **jamais en texte sur fond clair** (2,67:1) : utiliser `--accent-ink` / `text-panel-accent-ink`. Retard = indigo (`--late`), jamais le rose. Aucune couleur écrite en dur hors des couches de carte et des effets (et alors : `#f471b5`).
- **Barre de défilement** : jetons `--scrollbar-thumb(-hover)` par thème ; pseudo-éléments WebKit + `scrollbar-color` pour Firefox (index.css). Les captures Playwright masquent les barres (`--hide-scrollbars`) : pour les voir, `ignoreDefaultArgs: ['--hide-scrollbars']`.
- Pas de `Math.random()` dans les données : `mulberry32(graine)`.
- **Jeton non exposé = classe silencieusement ignorée** : `text-ink` n'existe que si `--color-ink` est dans `@theme inline` (index.css).
- **Tailwind, `calc` en valeur arbitraire** : espaces en `_` (`right-[calc(38%_-_var(--s-curve))]`).
- **Surcharger le CSS de MapLibre** : préfixer par `.maplibregl-map` (sa feuille est importée après la nôtre, à spécificité égale elle gagne).
- **Attendre la carte en test** : `section[aria-busy="false"]` (posé au premier `idle`), pas `networkidle` (les tuiles n'arrêtent jamais).
- **Clavier de la carte en test** : chaque touche lance une animation de 300 ms ; attendre ~450 ms entre deux appuis.
- **TanStack Table v9** : `tableFeatures({...})` + `useTable({ features, columns, data })` ; colonnes via `col.columns([...])` (sinon erreur de variance des types).
- **Source GeoJSON** : `cluster` ne se change pas après création → `key` sur `<Source>`.
- **Mesures de performance** : toujours sur le build de production (`playwright.perf.config.ts`), jamais en dev (React dev + recadrage du relief faussent tout).
- **Scripts Node en TS** : `node scripts/x.ts` (types retirés par Node 24) ; imports relatifs avec extension `.ts` (`allowImportingTsExtensions`).
- **Cycle d'imports** : `MAP_ID` vit dans `features/map/mapId.ts` (pas dans MapStage).
- **Graphiques** : jamais deux axes Y ; couleurs = `useChartColors()` (Recharts veut des couleurs résolues) ; toute nouvelle couleur de série passe par `validate_palette.js` (skill dataviz) en clair ET en sombre.
- **Thème** : appliqué de façon synchrone par `store/ui.ts` (sinon les couleurs lues au rendu sont celles du thème précédent).
- **Mock de calcul** : ne JAMAIS lui faire renvoyer un résultat qui ne correspond pas à la demande (ADR-013).
- **Zustand** : un sélecteur ne doit JAMAIS fabriquer un nouvel objet/tableau (`s.x ?? []`) → boucle infinie (« getSnapshot should be cached »). Sélectionner la valeur stable puis `useMemo`.
- **shadcn** : ne jamais laisser `init`/`add` redéfinir `--accent`, `--card`, `--chart-*` ni le fond de `body` (ADR-017) ; vérifier `git diff src/styles/index.css` après chaque commande shadcn.
- **Carte d'info** : toujours blanche (posée sur la carte sombre) → couleurs brutes (`bg-card`, `bg-[var(--panel)]`, `text-ink`), jamais `panel-*` qui suit le thème.
- **Superposition** : la bulle couvre la droite de la carte → éléments posés sur la carte à `right-[calc(var(--panel-w)_+_var(--panel-gap)_+_24px)]` (≥ 1024 px) ou au-dessus de `var(--sheet-h)` (< 1024 px) ; variante `panel-collapsed:` quand la bulle est repliée.
- **Verre** : `--glass-map-*` = contrôles sombres sur la carte (`glass`) ; `--glass-*` = bulle du panneau (`glass-bubble`), opacité verrouillée par `tokens.test.ts` : ne pas la baisser sans relancer le test.
- **Caméra et globe** : ne jamais lancer `fitBounds`/`flyTo` hors de la phase `routes` (GlobeDirector pilote la caméra) ; `cameraForBounds` est faux sur le globe → `features/globe/camera.ts` (Mercator) ; la boucle du globe cède la main si `map.isEasing()`.
- **MapLibre redessine en continu** après un `setPaintProperty` et pendant un fondu de libellés : `fadeDuration={0}` ; mesurer les rendus avec `cdpMapForTests.on('render')` (dev seulement).
- **e2e** : `openApp(page, thème, largeur, motion = 'none')` ; passer `'full'` pour tester le globe et le vol.
- **Impression** : `.print-sheet` (portail dans <body>) est la seule chose imprimée (`@media print` dans index.css) ; tester avec `page.emulateMedia({ media: 'print' })`.
- **Lien vers un service tiers** : toujours via la confirmation de `ShareNav` (coordonnées = données clients).
- **Camion physique** : `cameo/motion.ts` (trajectoire, vitesse, caméra : pur, testé) → `cameo/keyframes.ts` (une liste d'images clés par `data-part`) → `useCameo` (WAAPI linéaire). Toute nouvelle pièce animée : `data-part` + entrée dans `PartFrames` ; ne jamais animer une valeur constante (échec de composition « aucun changement visible »). Mesurer avec `e2e/s6.spec.ts`.
- **Camion 3D** (`features/truck3d/`) : `--u` = 100cqw/460 ; normales vers l'extérieur + `backface-visibility: hidden` (sud `rotateX(-90deg)` origine bas, avant `rotateY(90deg)` origine droite, arrière `rotateY(-90deg)` origine gauche, toit `translateZ`) ; ne pas dessiner l'invisible (dessous, flanc nord) ; pas de `filter: blur` (coût GPU, S6). Jamais de WebGL dans le panneau.
- **Camion du panneau** : effet n° 3 = budget épuisé (§3 bis) ; animer en `transform`/`opacity` WAAPI uniquement (S5 : `offset-path` n'est pas composé) ; en P5, appeler `notifySimulation()` de `features/cameo/bus.ts`.
- **Testing Library** : `cleanup` explicite dans `src/test/setup.ts` (pas de `globals`).
- **Nom accessible** d'un bouton à contenu riche : laisser le texte visible former le nom (axe `label-content-name-mismatch`).
- Couches ajoutées au style : dans `onLoad` de `MapStage` (sources `cdp-*`) ; deux sources raster-dem distinctes pour relief et ombrage.
