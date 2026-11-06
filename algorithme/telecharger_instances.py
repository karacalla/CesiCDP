# télécharge les instances X (Uchoa et al. 2017) et leurs meilleures solutions connues
# puis écrit bks.json (BKS = Best Known Solution)
# source : https://github.com/PyVRP/Instances

import json
import os
import urllib.request

ADRESSE = "https://raw.githubusercontent.com/PyVRP/Instances/main/CVRP/"

os.chdir(os.path.dirname(os.path.abspath(__file__)))  # chemins relatifs au dossier algorithme/

# instance de démo (partie 6 du notebook)
DEMO = ["X-n101-k25"]

# instances pour régler les paramètres (parties 8.1 à 8.3)
REGLAGE = ["X-n153-k22", "X-n303-k21", "X-n401-k29", "X-n701-k44"]

# les 24 instances de l'étude finale (partie 8.4)
ETUDE = [
    "X-n106-k14", "X-n110-k13", "X-n120-k6", "X-n125-k30", "X-n176-k26",
    "X-n190-k8", "X-n275-k28", "X-n280-k17", "X-n289-k60", "X-n294-k50",
    "X-n317-k53", "X-n401-k29", "X-n536-k96", "X-n573-k30", "X-n613-k62",
    "X-n627-k43", "X-n641-k35", "X-n670-k130", "X-n716-k35", "X-n749-k98",
    "X-n783-k48", "X-n837-k142", "X-n876-k59", "X-n936-k151",
]


# télécharge un fichier seulement s'il n'est pas déjà là
def telecharger(nom_fichier, dossier):
    chemin = os.path.join(dossier, nom_fichier)
    if not os.path.exists(chemin):
        print("téléchargement de", nom_fichier)
        urllib.request.urlretrieve(ADRESSE + nom_fichier, chemin)
    return chemin


# la ligne "Cost 27591" du fichier .sol donne le meilleur coût connu (BKS)
def lire_cout_solution(chemin_sol):
    with open(chemin_sol, encoding="utf-8") as f:
        for ligne in f:
            if ligne.startswith("Cost"):
                return int(float(ligne.split()[1]))
    return None


if __name__ == "__main__":
    os.makedirs("instances", exist_ok=True)
    # pour chaque instance : le .vrp, le .sol, et on garde le coût de référence
    bks = {}
    for nom in sorted(set(DEMO + REGLAGE + ETUDE)):
        telecharger(nom + ".vrp", "instances")
        chemin_sol = telecharger(nom + ".sol", "instances")
        bks[nom] = lire_cout_solution(chemin_sol)

    with open("bks.json", "w", encoding="utf-8") as f:
        json.dump(bks, f, indent=2)
    print(len(bks), "instances prêtes, coûts de référence écrits dans bks.json")
