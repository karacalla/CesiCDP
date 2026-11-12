# site/src — le code du site, expliqué pour quelqu'un qui n'y connaît rien

## 1. L'idée générale en 4 phrases

1. Le site est une **application web** : une seule page qui tourne dans le navigateur (pas de serveur web à nous).
2. Elle est écrite en **TypeScript** (du JavaScript avec des types qui détectent les erreurs avant de lancer) et
   construite avec **React** : l'écran est découpé en **composants** (des fonctions qui renvoient un morceau de page).
3. Les données (l'instance, le résultat du calcul, la vue choisie…) sont rangées dans des **stores** (des boîtes
   partagées) ; quand une donnée change, React redessine automatiquement les composants qui l'utilisent.
4. Le site **n'invente aucun calcul** : les tournées et les horaires viennent du solveur Python (via `serveur.py`)
   ou, en démonstration, d'un résultat simulé enregistré une fois.

## 2. Le trajet d'un clic (« Calculer les tournées »)

```
bouton (features/tours/RunHero.tsx)
  -> store/run.ts            : « un calcul démarre », garde les réglages
  -> services/api.ts         : choisit le mode : simulé (mockApi) ou solveur réel (httpApi)
  -> services/httpApi.ts     : envoie l'instance à serveur.py, demande « où en est le calcul ? » toutes les 0,5 s
  -> services/adapters.ts    : traduit la réponse Python (cout, tournees…) en noms du site (cost, routes…)
  -> types/vrp.ts (Zod)      : vérifie que la réponse est complète et correcte, sinon message d'erreur
  -> store/run.ts            : range le résultat
  -> features/tours/…        : la carte, les cartes de tournée, le Gantt se redessinent tout seuls
```

## 3. Les dossiers

| Dossier | Ce qu'il contient, simplement |
|---|---|
| `types/vrp.ts` | **le contrat** : la forme exacte d'une instance et d'un résultat (client, fenêtre, tournée…). Tout ce qui entre dans le site est vérifié avec ces règles. |
| `services/` | **les échanges** : `api.ts` (point d'entrée unique), `mockApi.ts` + `mockRun.ts` (mode simulé), `httpApi.ts` (vrai solveur), `adapters.ts` (traduction des noms). |
| `store/` | **la mémoire du site** : `vrp.ts` (l'instance, toujours valide), `run.ts` (le calcul), `selection.ts` (camion, arrêt, heure regardés), `ui.ts` (vue, thème), `scene.ts` (globe → vol → tournées). |
| `features/` | **les écrans**, un dossier par sujet : `tours/` (tournées, Gantt), `data/` (import, table des clients), `constraints/` (fenêtres, trafic), `run/` (réglages, convergence), `study/` (étude), `map/` (la carte), `globe/` (le globe d'ouverture), `cameo/` + `truck3d/` (le camion animé du panneau), `share/` (feuille de route, GPX). |
| `components/` | **les briques réutilisables** : bouton rond, interrupteur, champ de saisie, en-tête du panneau. |
| `lib/` | **les calculs simples et testés** : temps (minutes ↔ « 08:15 »), distances sur la Terre, contraste des couleurs, lecture des fichiers importés (`parsers/`). |
| `config/` | **les réglages** : fond de carte, équipe, capacités des algorithmes, paramètres du globe et du camion. |
| `i18n/fr.ts` | **tous les textes** affichés, en français, au même endroit. |
| `styles/` | **les couleurs et tailles** (`tokens.css`) : une seule source, dont les contrastes sont testés. |
| `workers/` | **le travail en arrière-plan** : la lecture d'un gros fichier importé, pour ne pas figer l'écran. |
| `hooks/` | petites fonctions React partagées (préférence « moins d'animations », couleurs des graphiques…). |

## 4. Comment lire un fichier

- Chaque fichier commence par un commentaire **Rôle · Choix retenu · Alternative écartée · Question du jury** :
  lisez-le d'abord, il dit à quoi sert le fichier et pourquoi il est fait ainsi.
- Les fichiers `*.test.ts` montrent, par des exemples, ce que chaque fonction doit faire.
- Les décisions importantes sont racontées dans `site/docs/DOSSIER_CONCEPTION.md` (ADR-001 à 027).

## 5. Vocabulaire minimum

| Mot | Sens |
|---|---|
| composant | fonction React qui renvoie un morceau d'écran (`<ToursView />`) |
| hook (`useXxx`) | fonction React qui lit ou garde une donnée (`useTours()` donne les tournées à afficher) |
| store (Zustand) | boîte de données partagée par tout le site |
| Zod | bibliothèque qui vérifie qu'une donnée a la bonne forme |
| mock | mode simulé : données de démonstration, sans solveur |
| MapLibre | bibliothèque qui dessine la carte (tuiles, relief, globe) |
| Web Worker | petit programme qui calcule à côté de la page, sans la bloquer |
