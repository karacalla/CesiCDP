# algorithme/ — le solveur de tournées (Python)

Le problème : un dépôt, des clients à livrer, des camions de même capacité. On cherche les tournées les plus
courtes qui livrent chaque client une fois, sans surcharger un camion (**CVRP**, niveau B) et, au niveau A, en
respectant la **fenêtre de temps** de chaque client (**CVRPTW**). Le notebook `Livrable_final_Groupe_6.ipynb`
raconte toute la démarche ; ce dossier contient le code qu'il utilise.

## Les fichiers, en une phrase chacun

| Fichier | Ce qu'il fait |
|---|---|
| `recuit_simple.py` | **le solveur** : lit une instance, construit une solution de départ (Clarke et Wright) puis l'améliore par recuit simulé avec 5 mouvements. Python pur, aucune bibliothèque à installer. |
| `experiences.py` | l'étude expérimentale (partie 8 du notebook) : réglage, ablation, effet du temps, 24 instances X, 56 instances de Solomon, très grandes instances. Écrit les CSV de `resultats/`. |
| `exact_bench.py` | la méthode exacte (PLNE avec PuLP + HiGHS) sur de petites instances, comparée au recuit (partie 3). |
| `serveur.py` | le pont avec le site web : sert les instances et lance le solveur à la demande du site. |
| `telecharger_instances.py` | télécharge les instances X et écrit leurs meilleurs coûts connus (`bks.json`). |
| `gen_carte.py` | le recuit sur 500 clients géolocalisés en France (distances en km), ancien prototype du site. |
| `Livrable_final_Groupe_6.ipynb` | le livrable : modélisation, complexité, PLNE, méthode, résultats, conclusion. |

| Données | Contenu |
|---|---|
| `instances/` | instances X d'Uchoa et al. (2017), format VRPLIB `.vrp`, sans fenêtres, et leurs solutions `.sol` |
| `solomon/` | les 56 instances de Solomon (1987), 100 clients, avec fenêtres de temps |
| `bks.json`, `bks_solomon.json` | meilleurs coûts connus (X) et optimums (Solomon, CVRPLIB) : la référence du gap |
| `resultats/` | les CSV des expériences, relus par le notebook |
| `donnees/donnees_cvrp_france.json` | 500 clients fictifs en France (pour `gen_carte.py`) |

## Lancer

```bash
pip install -r requirements.txt               # seulement pour le notebook, les expériences et le PLNE
python recuit_simple.py solomon/c101.txt      # démo : 10 s, trouve l'optimum 827,3
python recuit_simple.py instances/X-n101-k25.vrp
python serveur.py                             # pour lancer le solveur depuis le site (voir README du dépôt)
python experiences.py cvrptw                  # une expérience (long : plusieurs minutes)
```

## Les chiffres à retenir (notebook, partie 9)

- CVRP : écart moyen **2,1 %** au meilleur coût connu (24 instances X, 105 à 935 clients).
- CVRPTW : écart moyen **1,2 %** à l'optimum (56 instances de Solomon) ; optimum atteint sur 15 instances.
- 100 % des solutions vérifiées valables ; le PLNE prouve l'optimum jusqu'à 12 clients (60 avec fenêtres).
