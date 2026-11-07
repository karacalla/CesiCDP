# Contrat interface ↔ solveur (à l'attention de l'équipe solveur)

Source de vérité : `site/src/types/vrp.ts` (schémas Zod). Traduction des noms Python : `site/src/services/adapters.ts`.
Instances de démonstration : `site/src/data/nancy-60.instance.json` (60 clients fictifs) et GEN-1000 (générée, `site/src/data/gen1000.ts`).

## Unités et conventions

- Temps : **minutes depuis 00:00** (réel). Distances : **mètres** (instances géographiques) ; unité de l'instance sinon.
- Dépôt = nœud 0, clients 1…n. Coordonnées `lat`/`lng` (ou `y`/`x` si `meta.coordinates = "planar"`).
- Trafic : tranches contiguës `[from, to)` couvrant 00:00–24:00, `factor ≥ 1` multiplie le temps de parcours.
- Options : `timeWindows = "off" | "strict"`, `allowWait` (attente autorisée avant `a_i`).

## Ce que l'interface envoie (`SolveRequest`)

`instance` (format ci-dessus), `algo` ∈ `sa | clarke-wright | milp`, `params` = réglages de `resoudre()` :
`durationS` (duree), `seed` (graine), `K`, `t0`, `t1`, `moveProbas` (probas, **dans l'ordre de `NOMS_MOUVEMENTS`**, 4 aujourd'hui), `kMax` (k_max).

## Ce que l'interface sait lire

**Déjà compatible** avec la sortie actuelle de `resoudre()` : `cout`, `cout_initial`, `valide`, `message`, `iterations`, `routes` (listes d'indices), `historique` (t, coût, meilleur, T). Dans ce cas les arrêts n'ont **pas d'horaire** et l'interface l'affiche comme tel.

**À ajouter pour le Gantt, la simulation et le CO₂** (clés françaises, toutes facultatives) :

```json
{
  "objectif": "Distance routière totale (km)",
  "bks": 27591,
  "tournees": [{
    "camion": 1, "charge": 67, "distance_m": 38500, "debut": 450, "fin": 909,
    "geometrie": [[6.2045, 48.6862], [6.19, 48.69]],
    "arrets": [{ "client": 12, "arrivee": 512.4, "attente": 0, "depart": 522.4, "retard": 0 }],
    "trajets": [{ "de": 0, "vers": 12, "depart": 480, "duree_min": 32.4, "distance_m": 4100, "coef": 1.6 }]
  }],
  "comparaison": { "libelle": "Plus proche voisin", "distance_m": 770900 },
  "contraintes_ignorees": ["fenetres", "trafic"]
}
```

- `contraintes_ignorees` : contraintes activées que l'algorithme **n'a pas** traitées. L'interface affiche alors « non pris en compte » au lieu d'un faux résultat.
- `comparaison` : tournée de référence **calculée par le solveur** pour le CO₂ évité (l'interface n'invente aucun pourcentage).
- `trajets[].coef` : coefficient de trafic appliqué ; il sert à la vitesse affichée pendant la simulation.

## Routes HTTP prévues (`site/src/services/httpApi.ts`)

`GET /instances`, `GET /instances/:id`, `POST /solve` (suivi de progression : phase 3). Toute réponse est validée à la réception ; un champ manquant ou mal typé produit un message clair, jamais un affichage faux.
