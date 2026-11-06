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
│  ├─ main.tsx / App.tsx      montage React ; App = coque (P1)
│  ├─ styles/tokens.css       SOURCE UNIQUE des couleurs, rayons, gabarits ; thème = variables --panel-*
│  ├─ styles/index.css        Tailwind + @theme inline (expose les jetons : bg-accent, text-panel-ink…)
│  ├─ styles/tokens.test.ts   contrastes WCAG des paires + interdiction des textes < 12 px
│  ├─ config/basemap.ts       style de carte, relief, exagération (MapLibre par défaut / Mapbox)
│  ├─ config/team.ts          membres du groupe (noms null = à compléter par l'équipe, ne jamais inventer)
│  ├─ i18n/fr.ts              tous les textes d'interface
│  ├─ lib/contrast.ts         ratio WCAG 2.1
│  ├─ lib/random.ts           mulberry32 (graine) : seul générateur autorisé pour les données
│  ├─ types/vrp.ts            (P2) contrat de données aligné sur le solveur
│  ├─ services/               (P2) api.ts (façade), mockApi.ts, httpApi.ts, adapters.ts (noms Python → TS)
│  ├─ components/layout/      (P1) cadre, split, îlot de navigation, TeamHeader, mention RGPD
│  ├─ features/<vue>/         (P1+) map, data, constraints, run, results, simulation, study
│  ├─ hooks/  store/  workers/
│  └─ test/setup.ts           jest-dom pour Vitest
├─ spikes/                    essais S1–S3 (jetables, servis en dev seulement)
├─ e2e/                       Playwright : screenshots.spec.ts, spikes.spec.ts, a11y.spec.ts (P1)
└─ docs/                      SUIVI.md, DOSSIER_CONCEPTION.md, captures/, spikes/resultats.json
```

## Commandes

`npm run check` (= typecheck && lint && test && build) · `npm run shots` (captures 1280/768, `SHOTS_PHASE=p1` pour nommer) · `npm run spikes` · `npm run test:a11y`.

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
- **Gantt** : pas de re-rendu React pendant un zoom ou un défilement ; `transform` SVG puis re-rendu au relâchement (ADR-005).
- **`map.once('idle')` ne revient pas** si la carte est déjà inactive et que rien ne déclenche de rendu : appeler `map.triggerRepaint()` après avoir posé l'écouteur.
- **Import de MapLibre** : `import * as maplibregl from 'maplibre-gl'` (pas d'export par défaut dans les types).
- **Vite garde l'ancienne version d'une dépendance en cache** après un changement de version : arrêter le serveur sur :5199 et relancer avec `--force`.
- **Git Bash convertit `/chemin` en `C:/Program Files/Git/chemin`** dans les arguments : préfixer par `MSYS_NO_PATHCONV=1`.
- Ambre `--accent` **jamais en texte sur fond clair** (2,15:1) : utiliser `--accent-ink` / `text-panel-accent-ink`.
- Pas de `Math.random()` dans les données : `mulberry32(graine)`.
