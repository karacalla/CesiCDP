# =====================================================================================================
# telecharger_instances.py : récupère les instances X et leurs meilleurs coûts connus
# =====================================================================================================
#
# EN BREF
#   Télécharge chaque instance X (fichier .vrp) et sa meilleure solution connue (fichier .sol), puis écrit
#   bks.json = {nom de l'instance : meilleur coût connu}. C'est la référence pour calculer le gap.
#   Les fichiers déjà présents ne sont pas retéléchargés.
#   Les instances de Solomon (dossier solomon/) et leurs optimums (bks_solomon.json, valeurs de CVRPLIB)
#   ont été ajoutés à la main : ce script ne s'en occupe pas.
#
# source : https://github.com/PyVRP/Instances
#
# Rôle          : rendre l'étude reproductible : n'importe qui retrouve exactement nos instances et nos BKS
# Choix retenu  : jeu X d'Uchoa et al. (2017) : 100 instances de 100 à 1000 clients, variées (position du dépôt,
#                 répartition des clients aléatoire / en grappes, demandes), référence actuelle du CVRP
# Alternative   : jeux A/B/P (Augerat 1995) : trop petits (≤ 100 clients) pour étudier le passage à l'échelle ;
#   écartée       Golden (1998) : grandes instances mais peu nombreuses
# Question jury : « BKS = optimum ? » -> non : meilleure solution CONNUE ; prouvée optimale pour certaines
#                 instances seulement. Un gap de 0 % veut dire « aussi bon que le meilleur connu »

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

# grande instance de référence de l'expérience 8.6 (1000 clients) : sans elle dans bks.json,
# experiences.py taille ne pourrait pas calculer son gap
GRANDE = ["X-n1001-k43"]


# Télécharge un fichier seulement s'il n'est pas déjà là ; renvoie son chemin.
def telecharger(nom_fichier, dossier):
    chemin = os.path.join(dossier, nom_fichier)
    if not os.path.exists(chemin):
        print("téléchargement de", nom_fichier)
        urllib.request.urlretrieve(ADRESSE + nom_fichier, chemin)
    return chemin


# Lit le meilleur coût connu dans un fichier .sol : c'est la ligne « Cost 27591 ».
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
    for nom in sorted(set(DEMO + REGLAGE + ETUDE + GRANDE)):
        telecharger(nom + ".vrp", "instances")
        chemin_sol = telecharger(nom + ".sol", "instances")
        bks[nom] = lire_cout_solution(chemin_sol)

    with open("bks.json", "w", encoding="utf-8") as f:
        json.dump(bks, f, indent=2)
    print(len(bks), "instances prêtes, coûts de référence écrits dans bks.json")
