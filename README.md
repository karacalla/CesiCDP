# CesiCDP

Application React + Vite + Tailwind CSS v4 (cartographie avec Mapbox).

## Installation

```bash
git clone https://github.com/karacalla/CesiCDP.git
cd CesiCDP
npm install
```

## Configuration

Créer un fichier `.env` à la racine avec votre token Mapbox :

```bash
echo "VITE_MAPBOX_TOKEN=votre_token" > .env
```

## Lancer le projet

Mode développement :

```bash
npm run dev
```

Ou version de production :

```bash
npm run build
npm run preview
```

Ouvrir l'adresse locale affichée dans le terminal.


## Note : éditeur (VS Code)

Les fichiers `.css` utilisent des directives Tailwind v4 (`@reference`, `@apply`, `@theme`, `@utility`). Le linter CSS de base ne les connaît pas et affiche des avertissements « Unknown at rule » (sans effet sur le build).

1. Installer l'extension **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`).
2. Créer les réglages de l'éditeur :

```bash
mkdir -p .vscode && echo '{ "files.associations": { "*.css": "tailwindcss" }, "css.lint.unknownAtRules": "ignore" }' > .vscode/settings.json
```

   Attention : cette commande remplace un `.vscode/settings.json` existant. Si vous en avez déjà un, ajoutez plutôt ces deux lignes à la main dans le fichier.

3. Recharger la fenêtre (`Ctrl+Shift+P` → « Developer: Reload Window »). Les fichiers `.css` doivent s'afficher en mode « Tailwind CSS » dans la barre d'état.
