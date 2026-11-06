# expériences de la partie 8 du notebook, résultats dans resultats/ (csv relus par le notebook)
# python experiences.py reglage | ablation | budget | principale | tout

import csv
import json
import os
import sys
from multiprocessing import Pool

from recuit_simple import lire_instance, resoudre, PROBAS_DEFAUT, NOMS_MOUVEMENTS

NB_PROCESSUS = 6  # on a 8 coeurs, on en laisse 2
# meilleurs coûts connus pour chaque instance (écrit par telecharger_instances.py)
BKS = json.load(open("bks.json", encoding="utf-8"))

# pour le réglage : 4 tailles différentes (153, 303, 401 et 701 clients)
INSTANCES_REGLAGE = ["X-n153-k22", "X-n303-k21", "X-n401-k29", "X-n701-k44"]
GRAINES_REGLAGE = [1, 2, 3]
DUREE_REGLAGE = 10

# les 24 instances de l'étude finale
INSTANCES_ETUDE = [
    "X-n106-k14", "X-n110-k13", "X-n120-k6", "X-n125-k30", "X-n176-k26",
    "X-n190-k8", "X-n275-k28", "X-n280-k17", "X-n289-k60", "X-n294-k50",
    "X-n317-k53", "X-n401-k29", "X-n536-k96", "X-n573-k30", "X-n613-k62",
    "X-n627-k43", "X-n641-k35", "X-n670-k130", "X-n716-k35", "X-n749-k98",
    "X-n783-k48", "X-n837-k142", "X-n876-k59", "X-n936-k151",
]
GRAINES_ETUDE = [1, 2, 3, 4, 5]


# écart en % entre notre coût et le meilleur coût connu
def gap(cout, nom):
    return 100 * (cout - BKS[nom]) / BKS[nom]


# plus il y a de clients, plus on laisse de temps au recuit
def duree_selon_taille(n):
    if n <= 200:
        return 10
    if n <= 400:
        return 20
    if n <= 700:
        return 30
    return 45


# une exécution du recuit -> une ligne du csv
def une_execution(p):
    nom = p["instance"]
    t0 = p.get("t0", 0.5)
    t1 = p.get("t1", 0.01)
    K = p.get("K", 20)
    probas = p.get("probas", PROBAS_DEFAUT)

    # si un paramètre n'est pas donné on prend la valeur par défaut
    inst = lire_instance(os.path.join("instances", nom + ".vrp"))
    res = resoudre(inst, duree=p["duree"], graine=p["graine"], K=K, t0=t0, t1=t1, probas=probas)

    ligne = {
        "instance": nom,
        "n": res["n"],
        "bks": BKS[nom],
        "graine": p["graine"],
        "duree": p["duree"],
        "t0": t0,
        "t1": t1,
        "K": K,
        "cout": res["cout"],
        "gap": round(gap(res["cout"], nom), 3),
        "cout_init": res["cout_initial"],
        "gap_init": round(gap(res["cout_initial"], nom), 3),
        "routes": len(res["routes"]),
        "iterations": res["iterations"],
        "valide": res["valide"],
        "ecart_suivi": res["ecart_suivi"],
    }
    # nom de la variante testée (seulement pour l'ablation)
    variante = p.get("variante", "")
    if variante != "":
        ligne["variante"] = variante
    print(f"  {nom:12s} graine {p['graine']}  gap {ligne['gap']:5.2f} %  {variante}", flush=True)
    return ligne


def duree_de(p):
    return p["duree"]


def lancer(liste, fichier):
    # les plus longues d'abord pour que les coeurs finissent en même temps
    liste = sorted(liste, key=duree_de, reverse=True)
    print(f"{fichier} : {len(liste)} exécutions")
    # plusieurs exécutions en même temps, une par coeur
    with Pool(NB_PROCESSUS) as pool:
        lignes = pool.map(une_execution, liste)

    # écriture du csv
    os.makedirs("resultats", exist_ok=True)
    with open(os.path.join("resultats", fichier), "w", newline="", encoding="utf-8") as f:
        ecrivain = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        ecrivain.writeheader()
        ecrivain.writerows(lignes)
    return lignes


# valeur du paramètre qui donne le plus petit gap moyen
def meilleure_valeur(lignes, colonne):
    # on regroupe les gaps par valeur du paramètre
    gaps = {}
    for ligne in lignes:
        valeur = ligne[colonne]
        if valeur not in gaps:
            gaps[valeur] = []
        gaps[valeur].append(ligne["gap"])

    # puis on calcule la moyenne de chaque groupe et on garde la plus petite
    meilleure = None
    meilleure_moyenne = None
    for valeur in sorted(gaps):
        moyenne = sum(gaps[valeur]) / len(gaps[valeur])
        print(f"    {colonne} = {valeur:<6} gap moyen {moyenne:.2f} %")
        if meilleure_moyenne is None or moyenne < meilleure_moyenne:
            meilleure = valeur
            meilleure_moyenne = moyenne
    return meilleure


# toutes les combinaisons instance x graine avec ces paramètres
def essais_reglage(t0, t1, K):
    liste = []
    for i in INSTANCES_REGLAGE:
        for g in GRAINES_REGLAGE:
            liste.append({"instance": i, "graine": g, "duree": DUREE_REGLAGE, "t0": t0, "t1": t1, "K": K})
    return liste


# 8.1 réglage de t0, puis t1, puis K
def reglage():
    liste = []
    # d'abord t0 (t1 et K fixés)
    for t0 in [0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0]:
        liste += essais_reglage(t0, 0.01, 20)
    t0 = meilleure_valeur(lancer(liste, "reglage_t0.csv"), "t0")
    print("  -> t0 retenu :", t0)

    liste = []
    # puis t1 avec le meilleur t0
    for t1 in [0.001, 0.003, 0.01, 0.03, 0.1]:
        liste += essais_reglage(t0, t1, 20)
    t1 = meilleure_valeur(lancer(liste, "reglage_t1.csv"), "t1")
    print("  -> t1 retenu :", t1)

    liste = []
    # puis K avec les meilleurs t0 et t1
    for K in [5, 10, 20, 30, 50]:
        liste += essais_reglage(t0, t1, K)
    K = meilleure_valeur(lancer(liste, "reglage_K.csv"), "K")
    print("  -> K retenu :", K)

    # on sauvegarde le réglage pour les autres expériences (et gen_carte.py)
    with open(os.path.join("resultats", "reglage_choisi.json"), "w") as f:
        json.dump({"t0": t0, "t1": t1, "K": K}, f)


# relit le réglage trouvé par reglage(), sinon les valeurs par défaut
def reglage_choisi():
    chemin = os.path.join("resultats", "reglage_choisi.json")
    if os.path.exists(chemin):
        return json.load(open(chemin))
    return {"t0": 0.5, "t1": 0.01, "K": 20}


# 8.2 ablation : on enlève un mouvement à la fois
def ablation():
    r = reglage_choisi()
    variantes = [("tous les mouvements", PROBAS_DEFAUT, r["t0"], r["t1"])]
    for k in range(len(NOMS_MOUVEMENTS)):
        probas = list(PROBAS_DEFAUT)
        # proba 0 = ce mouvement n'est jamais tiré
        probas[k] = 0
        variantes.append(("sans " + NOMS_MOUVEMENTS[k], probas, r["t0"], r["t1"]))
    # descente seule : T = 0, on n'accepte que les améliorations
    variantes.append(("descente seule (T = 0)", PROBAS_DEFAUT, 0, 0))

    liste = []
    for nom, probas, t0, t1 in variantes:
        for i in INSTANCES_REGLAGE:
            for g in GRAINES_REGLAGE:
                liste.append({"instance": i, "graine": g, "duree": DUREE_REGLAGE, "variante": nom,
                              "probas": probas, "t0": t0, "t1": t1, "K": r["K"]})
    lancer(liste, "ablation.csv")


# 8.3 effet du temps de calcul
def budget():
    r = reglage_choisi()
    liste = []
    for i in ["X-n153-k22", "X-n303-k21", "X-n701-k44"]:
        for duree in [2, 5, 10, 20, 40, 80]:
            for g in GRAINES_REGLAGE:
                liste.append({"instance": i, "graine": g, "duree": duree,
                              "t0": r["t0"], "t1": r["t1"], "K": r["K"]})
    lancer(liste, "budget.csv")


# 8.4 étude principale : 24 instances, 5 graines
def principale():
    r = reglage_choisi()
    liste = []
    for i in INSTANCES_ETUDE:
        n = int(i.split("-")[1][1:]) - 1  # "X-n106-k14" -> 105 clients
        for g in GRAINES_ETUDE:
            liste.append({"instance": i, "graine": g, "duree": duree_selon_taille(n),
                          "t0": r["t0"], "t1": r["t1"], "K": r["K"]})
    lancer(liste, "principale.csv")


if __name__ == "__main__":
    quoi = "tout"
    if len(sys.argv) > 1:
        quoi = sys.argv[1]
    if quoi == "reglage" or quoi == "tout":
        reglage()
    if quoi == "ablation" or quoi == "tout":
        ablation()
    if quoi == "budget" or quoi == "tout":
        budget()
    if quoi == "principale" or quoi == "tout":
        principale()
