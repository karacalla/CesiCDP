# CesiCDP

Dépôt du groupe 6 : `algorithme/` (solveur Python : recuit simulé, PLNE, expériences) et `site/` (interface React + TypeScript du dispatcher).

## Interface (`site/`)

Carte MapLibre avec relief, sans clé ni compte : aucun fichier `.env` n'est nécessaire.

```bash
git clone https://github.com/karacalla/CesiCDP.git
cd CesiCDP/site
npm install
npm run dev        # serveur de développement
npm run check      # vérification de types, lint, tests, build
```

Option (fichier `site/.env.local`, facultatif) : `VITE_API_MODE=mock|http` (données simulées par défaut).

Documentation : `site/docs/SUIVI.md` (état d'avancement) et `site/docs/DOSSIER_CONCEPTION.md` (dossier de conception).

## Note : éditeur (VS Code)

Les fichiers `.css` utilisent des directives Tailwind v4 (`@reference`, `@apply`, `@theme`, `@utility`). Le linter CSS de base ne les connaît pas et affiche des avertissements « Unknown at rule » (sans effet sur le build).

1. Installer l'extension **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`).
2. Créer les réglages de l'éditeur :

```bash
mkdir -p .vscode && echo '{ "files.associations": { "*.css": "tailwindcss" }, "css.lint.unknownAtRules": "ignore" }' > .vscode/settings.json
```

   Attention : cette commande remplace un `.vscode/settings.json` existant. Si vous en avez déjà un, ajoutez plutôt ces deux lignes à la main dans le fichier.

3. Recharger la fenêtre (`Ctrl+Shift+P` → « Developer: Reload Window »). Les fichiers `.css` doivent s'afficher en mode « Tailwind CSS » dans la barre d'état.
