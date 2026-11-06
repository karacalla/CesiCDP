# CesiCDP — Frontend du dispatcher (CLAUDE.md)

Interface web d'aide à la décision pour la gestion de tournées de livraison (CVRPTW avec trafic par tranche horaire).
Contexte : réponse de l'équipe CesiCDP (Groupe 6, 4 personnes, CESI FISE INFO A3) à l'appel à manifestation d'intérêt ADEME « Mobilité Multimodale Intelligente ».
Utilisateur cible : le dispatcher logistique. Public de la soutenance : jury d'encadrants + « vendeurs » (ADEME) : chaque choix doit être justifiable à l'oral.

## 1. Périmètre (à ne pas dépasser)

- Je développe **uniquement le frontend** (React SPA). Le solveur Python (recuit simulé, PLNE) est écrit par l'équipe, séparément.
- Seules les API externes de **carte** sont autorisées en direct (tuiles, relief). Tout le reste passe par `src/services/api.ts` sur **données simulées** (`mockApi.ts`), déterministes (graine fixe).
- **Ne jamais** appeler OSRM ou un autre service avec des coordonnées de clients depuis le navigateur (RGPD : les données importées restent locales). Les tracés routiers viennent du backend ; en mode mock ils sont **pré-calculés une fois** pour une instance fictive et commités en GeoJSON.
- Données de démonstration = clients **fictifs** uniquement. Aucun nom ni adresse de personne réelle.

## 2. Commandes

```
npm run dev        # serveur de dev
npm run typecheck  # tsc --noEmit (strict)
npm run lint
npm run test       # Vitest + Testing Library
npm run test:a11y  # axe sur les vues principales
npm run build
```
Avant de dire « terminé » : `typecheck && lint && test && build` doivent passer. Une vue visible doit aussi être **regardée** (capture d'écran Playwright) avant d'être déclarée finie.

## 3. Stack (décisions figées ; toute déviation = entrée dans `docs/DOSSIER_CONCEPTION.md`)

| Besoin | Choix | Pourquoi (en une ligne) |
|---|---|---|
| Base | Vite + React 18 + TypeScript strict | SPA locale, pas de SSR utile, démo hors-ligne simple |
| Style | Tailwind (tokens en variables CSS) + composants accessibles (shadcn/Radix) | clavier et ARIA gérés ; tokens = identité unique |
| Carte | `react-map-gl` + **MapLibre GL JS** par défaut ; Mapbox en option via `VITE_BASEMAP=mapbox` + `VITE_MAPBOX_TOKEN` | gratuit, sans carte bancaire ; un seul fichier `config/basemap.ts` à changer |
| Relief | DEM Terrarium (libre) ou `mapbox-terrain-dem-v1` selon le profil | relief réel, exagération ≈ 1,4 |
| Camion 3D | `deck.gl` `ScenegraphLayer` (glTF libre de droits) via `MapboxOverlay` | GPU, orientation par tangente de la route |
| Pins nombreux | couche GPU deck.gl (`ScatterplotLayer` + clustering) | le DOM ne tient pas au-delà de ≈ 500 marqueurs |
| Pins « verre » | marqueurs HTML **seulement** pour actif/survolé/≤ 40 visibles | identité visuelle sans casser les performances |
| État | Zustand | petit, lisible à l'oral |
| Tables | TanStack Table + TanStack Virtual | 1000+ lignes, édition en ligne |
| Graphiques | Recharts (convergence, trafic, passage à l'échelle) ; **Gantt en SVG maison** (d3-scale) | Recharts ne fait pas de Gantt |
| Validation | Zod (import CSV/JSON/VRPLIB et réponses API) | jamais de donnée non vérifiée dans l'UI |
| Tests | Vitest, Testing Library, Playwright (captures), axe | |

Points à valider par un essai court (« spike ») en phase 0, résultat noté dans le dossier : (S1) les couches deck.gl suivent-elles le relief MapLibre/Mapbox ? sinon : tracés en couches natives de la carte (elles épousent le relief) et altitude du camion via `map.queryTerrainElevation`. (S2) 1000 clients en couche GPU ≥ 45 images/s. (S3) Gantt 20 camions × 50 arrêts fluide.

## 4. Identité visuelle (inspirée de la maquette « Roam », sans copier son code)

Principe : **un seul accent (ambre), du noir/navy et du blanc**. La couleur signifie quelque chose, jamais de décor.

- **Cadre** : application encapsulée, `max-w-[1536px]`, `rounded-[36px]`, bordure `white/10`. Split asymétrique : carte **62 %** (gauche, toujours sombre) / panneau **38 %** (droite, clair par défaut), le panneau empiète sur la carte (bord en S de ≈ 40 px + ombre, poignée verticale).
- **Carte** : vue de drone, **pitch 0–30° par défaut** (la 3D se révèle à la sélection d'un camion : pitch 60–70°). Satellite désaturé + voile sombre + vignette. Trajet à deux états : **parcouru = ambre plein épais**, **à venir = blanc pointillé avec fond de route**. Curseur de navigation = flèche ambre dans un disque de verre avec cône de visée.
- **Verre** : `bg-black/45 backdrop-blur-xl border border-white/15`. Boutons ronds 36–40 px ; barre de navigation en îlot (pill) de 5 boutons, l'actif est blanc plein. Colonne d'outils carte (actualiser, +, −, localiser) en bas à droite.
- **Carte d'info flottante** : blanche, `rounded-3xl`, ≈ 320 px, bouton ✕ détaché sous la carte ; contenu : titre en gras, pastille de statut, deux compteurs, distance/ETA, mini-profil d'altitude.
- **Panneau** : recherche + cloche + avatar ; **showcase du camion** détouré (vue de dessus, `drop-shadow-2xl`) qui **déborde** sur la carte « dernière tournée » ; liste « Dernières tournées » en cartes sombres `rounded-2xl` avec texture de plan de rues à 15 %, timeline horizontale (point départ — ligne ambre fine — icône camion centrale — point arrivée), durée en gras, distance en pastille.
- **Typographie** : Inter (ou Plus Jakarta Sans). Contraste de graisse : titres de contexte très légers (300), titres de contenu 600–700, chiffres clés 800–900. **Taille minimale 12 px** (jamais 9–11 px).

### Jetons (`src/styles/tokens.css`) — valeurs et ratios de contraste calculés

| Jeton | Valeur | Usage / contrainte WCAG AA |
|---|---|---|
| `--bg` / `--bg-dark` / `--bg-darker` | `#0f172a` / `#0c1425` / `#0a1120` | surfaces sombres (palette de l'équipe) |
| `--muted-bg` | `#1e293b` | pastilles et fonds secondaires sombres |
| `--muted-text` | `#6d7580` | **3,83:1 sur `--bg` → interdit pour le texte courant** (décor, grand texte seulement) |
| `--muted-text-aa` | `#9aa4b2` | texte secondaire sombre (7,08:1) |
| `--accent` | `#f59e0b` (hover `#fbbf24`) | marque, sélection, trajet actif. **Sur blanc : 2,15:1 → jamais en texte sur clair** ; texte sur ambre = `#020617` (9,39:1) ; texte ambre sur clair = `#b45309` (5,02:1) |
| `--panel` / `--card` | `#f1f3f5` / `#ffffff` | panneau clair et cartes |
| `--ink` / `--ink-2` | `#0f172a` / `#475569` | texte sur clair (`#64748b` sur `#f1f3f5` = 4,28:1 ✗ ; `#94a3b8` sur blanc = 2,56:1 ✗) |
| `--journey-card` | `#242b33` | cartes de tournées sombres |
| `--ok` / `--wait` / `--late` | `#34d399` / `#3abdf8` / `#f471b5` | statuts Gantt et pins ; toujours **icône + libellé**, jamais la couleur seule. Remplace vert/orange/rouge : l'orange entrerait en conflit avec l'ambre de la marque |
| Indigo `#818cf8` | | seconde série des graphiques (5,98:1 sur sombre) |

Règles couleur : camion sélectionné = ambre ; les autres = blanc 45 %. Option « colorier par camion » (palette catégorielle sûre pour le daltonisme, jetons `--route-1…8`) **désactivée par défaut**. La couleur d'un camion n'est jamais utilisée pour un statut.
Thèmes : **Clair** = panneau `--panel` (défaut). **Sombre** = panneau en `--bg`. La carte reste sombre dans les deux cas.
Texte sur le verre : toujours sur voile (`bg-black/45` minimum) ; vérifier le contraste sur une capture réelle, pas en théorie.

## 5. Contrat de données (source unique : `src/types/vrp.ts`, aligné sur le solveur Python)

- Le **solveur est la seule source de vérité** des heures d'arrivée, attentes et retards. Le frontend **n'implémente jamais** le calcul de trafic ou de faisabilité : il affiche, interpole le long du tracé, et valide la saisie.
- Unités : temps en **minutes depuis 00:00** (réel), distances en **mètres**, coordonnées `[lng, lat, alt?]`.
- Vocabulaire : dépôt = nœud 0, clients 1…n ; `q_i` demande, `Q` capacité, `k` camions, `[a_i,b_i]` fenêtre, `s_i` service, `d^t` coefficient de trafic de la tranche `t`.
- `Instance` : `depot`, `customers[]` (`id,name,lat,lng,demand,tw:{a,b}|null,service`), `fleet` (`k,Q,fixedCost,baseSpeedKmh`), `traffic.slots[]` (`from,to,factor`, tranches contiguës couvrant la journée, `factor ≥ 1` = ralentissement), `options` (`timeWindows:'off'|'strict'`, `allowWait`).
- `SolveRequest` : `instance`, `algo:'sa'|'clarke-wright'|'milp'`, `params` (`durationS, seed, K, t0, t1, moveProbas[7], kMax?`). Réglages = ceux du notebook du groupe (`resoudre(...)`).
- `SolveResult` : `cost, costInitial, valid, message, iterations, bks?, gap?, routes[]` (`vehicleId, load, distanceM, geometry, stops[]` avec `customerId, arrival, wait, departure, late`), `history[]` (`t, cost, temp`, pas ≈ 0,5 s).
- Calcul d'écart : `gap = 100 × (coût − BKS) / BKS`. **Toujours afficher la définition de l'objectif** à côté d'un gap (le meilleur connu d'un jeu de référence peut optimiser autre chose que le temps total).
- CO₂ : `distance × facteur` (facteur configurable, défaut 0,29 kg/km, source à citer dans le dossier). La tournée de comparaison est **calculée par le solveur** (ex. voisin le plus proche) : jamais de pourcentage inventé.
- Un adaptateur `services/adapters.ts` traduit les noms du solveur (`cout`, `valide`, `historique`…) vers les types TS ; le reste du code ne voit que les types TS.
- Le mode se choisit par `VITE_API_MODE=mock|http`. Les appels longs renvoient un `RunHandle` (`onProgress`, `cancel`).

## 6. Exigences de l'encadrant (retour du 06/11/2026, note 70/100) → traçabilité

| # | Exigence | Où dans l'UI |
|---|---|---|
| E1 | Liste des membres du groupe dans l'en-tête | `components/layout/TeamHeader` lit `config/team.ts` (4 membres, **à compléter par l'équipe : ne jamais inventer de noms**) |
| E2 | Fenêtres de temps `[a_i,b_i]` au cœur du problème (interdiction hors fenêtre, attente possible) | colonnes de la table clients, interrupteurs `timeWindows` / `allowWait`, Gantt avec fenêtres |
| E3 | Trafic par tranche horaire **obligatoire** | `TrafficMatrix` (tranches éditables + coefficients) ; impact visible sur le temps de parcours et sur la vitesse pendant la simulation |
| E4 | Rigueur de la complexité (preuve, asymptotique) | section dédiée du dossier de conception + vue « Méthode » (optionnelle, phase 6) |
| E5 | Étude de passage à l'échelle, instances de référence réalistes | vue « Étude » : import des CSV du notebook (`principale.csv`…), gap vs taille, temps vs taille (échelle log), écart-type par graine |

Alerte de cohérence : l'état actuel du solveur (notebook) ne traite que le CVRP ; fenêtres et trafic n'y sont que dans le PLNE. Le frontend doit **déjà** exposer E2/E3 et afficher clairement « non pris en compte par cet algorithme » tant que le solveur ne les gère pas (jamais de faux résultat).

## 7. Accessibilité, RGPD, performance

- **WCAG 2.1 AA** : contrastes (voir jetons), navigation clavier complète, focus visible, `aria-label` sur tout bouton-icône, `prefers-reduced-motion` respecté (carte : pas d'orbite automatique, pas de pulsations), **ne pas** mettre `select-none` globalement. Alternative texte à la carte : la liste des arrêts doit tout dire.
- **RGPD** : traitement local des fichiers importés, mention visible dans l'UI ; aucun appel réseau avec des données clients ; pas d'image hébergée chez un tiers (avatars compris) ; **les requêtes de tuiles révèlent la zone consultée** : à écrire dans le dossier.
- **Performance** : import de 1000 clients sans tâche > 100 ms bloquante (parser dans un Web Worker) ; tables virtualisées ; convergence échantillonnée à ≤ 500 points ; un seul `requestAnimationFrame` annulé au démontage ; jamais de `Math.random()` non initialisé dans les données.

## 8. Code et commentaires (le jury interroge sur le code)

- Identifiants en **anglais**, interface et documents en **français** (textes centralisés dans `src/i18n/fr.ts`). Commits en anglais, impératif.
- En-tête de chaque fichier important (≤ 8 lignes) : **Rôle · Choix retenu · Alternative écartée · Question probable du jury**. Pas de commentaire ligne à ligne qui répète le code.
- Composants de présentation purs, logique dans des hooks (`useTruckSimulation`, `useVrpData`, `useSolveRun`). Un composant = un fichier < 250 lignes.
- Pas de `any`, pas de `// @ts-ignore`. Données externes : Zod à la frontière.

## 9. Fichiers de suivi (mise à jour **obligatoire** à la fin de chaque tâche)

Ne pas les importer dans ce fichier (un import se charge à chaque session). Les lire **à la demande**.

| Fichier | Contenu | Taille cible |
|---|---|---|
| `docs/SUIVI.md` | état par phase, prochaine action, décisions ouvertes, écarts. **À lire en premier** à chaque session | ≤ 100 lignes |
| `.claude/skills/cesicdp-frontend/SKILL.md` | plan du code (qui fait quoi), recettes (ajouter une vue, un type, un jeton), pièges connus | ≤ 150 lignes |
| `docs/DOSSIER_CONCEPTION.md` | dossier académique **autonome** : besoin, parcours, décisions (ADR : contexte → options → critique → choix → conséquence), jetons, accessibilité, RGPD, tests, limites, glossaire, script de démo, questions probables du jury | complété phase après phase, jamais réécrit de zéro |

Règle : tout choix non trivial = une entrée ADR **avant** le code. Une session qui change le code sans mettre à jour `SUIVI.md` n'est pas terminée.

## 10. Interdits

- Copier le code de la maquette de référence : Three.js r125 depuis un CDN, terrain et bâtiments aléatoires, Tailwind via CDN, avatar hébergé ailleurs, textes de 9 px. On reprend l'**identité**, pas l'implémentation.
- Inventer des chiffres (gaps, économies de CO₂, temps) ou des noms de membres.
- Étendre le périmètre au backend ou ajouter une dépendance sans ADR.
- Déclarer une vue « terminée » sans l'avoir regardée en capture, à deux largeurs (≥ 1280 px et 768 px).
