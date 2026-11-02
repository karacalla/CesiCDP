# TODO

## Mode clair (abandonné pour l'instant)

`src/styles/themes/light.css` est vidé (fichier conservé, toujours importé dans `styles/index.css`).

À faire quand on reprend :
- Décider si la feuille de droite (dashboard) devient sombre en mode sombre, ou reste une feuille claire à côté de la carte sombre comme aujourd'hui.
- Passer les composants sur des tokens de thème (`@theme`) au lieu de `bg-white` / `text-slate-*` : `Button` (variante `light`), `Card`, `Input`, `StatTile`.
- `Journey` et la carte CO₂ utilisent `--color-bg` comme fond sombre fixe avec du texte blanc : leur donner des tokens dédiés pour qu'ils ne cassent pas en mode clair.
- Redéfinir les variables sous `:root[data-theme="light"]` (palette clair choisie : bg `#f1f3f5`, card `#fff`, texte `#0f172a`, muted `#64748b`, bordure `#e2e8f0`).
- Ajouter un sélecteur de thème (toggle ou `prefers-color-scheme`).
