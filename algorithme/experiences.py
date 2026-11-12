# =====================================================================================================
# experiences.py : l'étude expérimentale (partie 8 du notebook)
# =====================================================================================================
#
# EN BREF
#   Ce script lance le recuit des centaines de fois sur des instances de référence et écrit un fichier
#   CSV par expérience dans resultats/. Le notebook relit ces CSV pour faire les tableaux et les
#   graphiques : on n'a pas besoin de refaire 1 h 30 de calcul pour relire le notebook.
#
# LES QUESTIONS POSÉES (une fonction par question)
#   reglage()      8.1  quelles valeurs pour t0, t1 et K ?
#   ablation()     8.2  chaque mouvement sert-il ? le recuit fait-il mieux qu'une simple descente ?
#   budget()       8.3  que gagne-t-on en laissant plus de temps (2 à 40 s) ?
#   etude_cvrp()   8.4  qualité sur 24 instances X sans fenêtres (105 à 935 clients)
#   etude_cvrptw() 8.5  qualité sur les 56 instances de Solomon avec fenêtres (100 clients)
#   taille()       8.6  et sur de très grandes instances (jusqu'à 3000 clients) ?
#
# COMMENT ON MESURE
#   gap = 100 × (notre coût − meilleur coût connu) / meilleur coût connu   (0 % = aussi bien que le record)
#   Le recuit utilise le hasard : chaque cas est relancé avec plusieurs « graines » (2 ou 3), et on regarde
#   la moyenne ET l'écart entre graines.
#
# LANCER
#   python experiences.py reglage | ablation | budget | cvrp | cvrptw | taille | tout
#   Si on arrête le script en cours de route, on peut le relancer : il reprend là où il en était.
#
# deux familles d'instances :
#   - CVRP   : instances X (fichiers instances/X-....vrp), sans fenêtres de temps
#   - CVRPTW : instances de Solomon (fichiers solomon/....txt), avec fenêtres de temps

import csv
import json
import os
import random
import sys
import time
from multiprocessing import Pool

from recuit_simple import (lire_instance, lire_instance_solomon, resoudre, calcul_distances,
                           voisins_proches, clarke_wright, cout_total, PROBAS_DEFAUT, PROBAS_FENETRES,
                           NOMS_MOUVEMENTS)

# plusieurs exécutions en même temps, une par cœur du processeur (on en laisse 2 libres si la machine
# en a beaucoup). On utilise des PROCESSUS et pas des threads : en Python, deux threads ne peuvent pas
# calculer en même temps (verrou global de l'interpréteur, le « GIL »), deux processus si.
NB_PROCESSUS = max(1, min(6, os.cpu_count() - (2 if os.cpu_count() > 4 else 0)))

# meilleurs coûts connus : instances X (bks.json) et optimums de Solomon (bks_solomon.json)
BKS = json.load(open("bks.json", encoding="utf-8"))
BKS.update(json.load(open("bks_solomon.json", encoding="utf-8")))

# pour le réglage : 2 instances sans fenêtres et 2 avec (assez différentes pour que le réglage soit général)
INSTANCES_REGLAGE = ["X-n153-k22", "X-n303-k21", "r107", "rc203"]
GRAINES_REGLAGE = [1, 2]
DUREE_REGLAGE = 10

# les 24 instances X de l'étude CVRP
INSTANCES_CVRP = [
    "X-n106-k14", "X-n110-k13", "X-n120-k6", "X-n125-k30", "X-n176-k26",
    "X-n190-k8", "X-n275-k28", "X-n280-k17", "X-n289-k60", "X-n294-k50",
    "X-n317-k53", "X-n401-k29", "X-n536-k96", "X-n573-k30", "X-n613-k62",
    "X-n627-k43", "X-n641-k35", "X-n670-k130", "X-n716-k35", "X-n749-k98",
    "X-n783-k48", "X-n837-k142", "X-n876-k59", "X-n936-k151",
]
# les 56 instances de Solomon de l'étude CVRPTW, en 6 familles :
#   C = clients regroupés en paquets, R = clients au hasard, RC = mélange des deux ;
#   type 1 = fenêtres étroites et petits camions, type 2 = fenêtres larges et gros camions
# "c1%02d" % 3 donne "c103" : c'est une façon courte d'écrire la liste des noms
INSTANCES_CVRPTW = (["c1%02d" % k for k in range(1, 10)] + ["c2%02d" % k for k in range(1, 9)]
                    + ["r1%02d" % k for k in range(1, 13)] + ["r2%02d" % k for k in range(1, 12)]
                    + ["rc1%02d" % k for k in range(1, 9)] + ["rc2%02d" % k for k in range(1, 9)])
GRAINES_ETUDE = [1, 2, 3]
DUREE_CVRPTW = 20


# lit une instance d'après son nom (X-... = fichier .vrp, sinon fichier de Solomon)
def charger(nom):
    if nom.startswith("X-"):
        return lire_instance(os.path.join("instances", nom + ".vrp"))
    return lire_instance_solomon(os.path.join("solomon", nom + ".txt"))


# écart en % entre notre coût et le meilleur coût connu
def gap(cout, nom):
    return 100 * (cout - BKS[nom]) / BKS[nom]


# plus il y a de clients, plus on laisse de temps au recuit
# (chaque client doit être « visité » assez souvent par les mouvements pour être bien placé)
def duree_selon_taille(n):
    if n <= 200:
        return 10
    if n <= 400:
        return 20
    if n <= 700:
        return 30
    return 45


# Une exécution du recuit -> une ligne du CSV.
# p est un dictionnaire qui décrit l'essai : instance, graine, durée, réglages, variante d'ablation.
# On lit l'instance, on choisit les probabilités des mouvements (avec ou sans fenêtres), on retire
# éventuellement un mouvement (ablation), on lance resoudre() et on range le résultat.
def une_execution(p):
    nom = p["instance"]
    # si un paramètre n'est pas donné on prend la valeur par défaut
    t0 = p.get("t0", 0.5)
    t1 = p.get("t1", 0.01)
    K = p.get("K", 20)

    inst = charger(nom)
    # probabilités des mouvements : celles du problème (avec ou sans fenêtres)
    if "fenetres" in inst:
        probas = list(PROBAS_FENETRES)
    else:
        probas = list(PROBAS_DEFAUT)
    # ablation : "sans" = numéro du mouvement qu'on retire
    if p.get("sans") is not None:
        probas[p["sans"]] = 0
    res = resoudre(inst, duree=p["duree"], graine=p["graine"], K=K, t0=t0, t1=t1, probas=probas)

    ligne = {
        "probleme": "CVRPTW" if "fenetres" in inst else "CVRP",
        "instance": nom,
        "n": res["n"],
        "bks": BKS[nom],
        "graine": p["graine"],
        "duree": p["duree"],
        "t0": t0,
        "t1": t1,
        "K": K,
        "variante": p.get("variante", ""),   # nom de la variante testée (ablation)
        "cout": round(res["cout"], 1),
        "gap": round(gap(res["cout"], nom), 3),
        "cout_init": round(res["cout_initial"], 1),
        "gap_init": round(gap(res["cout_initial"], nom), 3),
        "routes": len(res["routes"]),
        "iterations": res["iterations"],
        "temps_total": round(res["temps"], 2),   # préparation (distances, départ) + recuit
        "valide": res["valide"],
        "ecart_suivi": round(res["ecart_suivi"], 6),
    }
    print(f"  {nom:12s} graine {p['graine']}  gap {ligne['gap']:5.2f} %  {ligne['variante']}", flush=True)
    return ligne


# Ce qui identifie une exécution : (instance, graine, durée, t0, t1, K, variante).
# Sert à savoir si un essai est déjà dans le CSV, pour ne pas le refaire après une interruption.
def cle(p):
    return (p["instance"], str(p["graine"]), str(float(p["duree"])), str(float(p.get("t0", 0.5))),
            str(float(p.get("t1", 0.01))), str(int(p.get("K", 20))), p.get("variante", ""))


# clé de tri : la durée d'un essai
def duree_de(p):
    return p["duree"]


# Lance les exécutions qui manquent et complète le CSV au fur et à mesure.
#   - relit le CSV s'il existe et retire de la liste les essais déjà faits ;
#   - trie les essais du plus long au plus court : ainsi tous les cœurs finissent à peu près ensemble ;
#   - les répartit sur plusieurs processus (Pool) et écrit chaque ligne dès qu'elle arrive (flush) :
#     si on coupe le script, rien de ce qui est fini n'est perdu.
# Attention sous Windows : chaque processus relit ce fichier ; c'est pourquoi le lancement est protégé
# par if __name__ == "__main__" tout en bas.
def lancer(liste, fichier):
    os.makedirs("resultats", exist_ok=True)
    chemin = os.path.join("resultats", fichier)
    lignes = []
    if os.path.exists(chemin):
        lignes = list(csv.DictReader(open(chemin, encoding="utf-8")))
    deja = {cle(ligne) for ligne in lignes}
    # les plus longues d'abord pour que les coeurs finissent en même temps
    a_faire = sorted([p for p in liste if cle(p) not in deja], key=duree_de, reverse=True)
    print(f"{fichier} : {len(liste)} exécutions, {len(a_faire)} à faire")

    with Pool(NB_PROCESSUS) as pool, open(chemin, "a", newline="", encoding="utf-8") as f:
        ecrivain = None
        for ligne in pool.imap_unordered(une_execution, a_faire):
            if ecrivain is None:
                ecrivain = csv.DictWriter(f, fieldnames=list(ligne.keys()))
                if len(lignes) == 0:
                    ecrivain.writeheader()
            ecrivain.writerow(ligne)
            f.flush()
    # on relit tout le fichier (anciennes + nouvelles lignes), avec les nombres en nombres
    lignes = list(csv.DictReader(open(chemin, encoding="utf-8")))
    for ligne in lignes:
        for colonne in ("gap", "t0", "t1"):
            ligne[colonne] = float(ligne[colonne])
        ligne["K"] = int(ligne["K"])
    return lignes


# Affiche le gap moyen pour chaque valeur d'un paramètre et renvoie la valeur qui donne le plus petit.
# (On ne prend pas forcément ce minimum : voir REGLAGE_RETENU plus bas, à cause du bruit.)
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


# Toutes les combinaisons « instance de réglage × graine » pour un jeu de paramètres (t0, t1, K).
def essais_reglage(t0, t1, K):
    liste = []
    for i in INSTANCES_REGLAGE:
        for g in GRAINES_REGLAGE:
            liste.append({"instance": i, "graine": g, "duree": DUREE_REGLAGE, "t0": t0, "t1": t1, "K": K})
    return liste


# réglage retenu après l'expérience 8.1 (voir le notebook) : entre t0 = 1 et t0 = 4, et entre
# K = 20 et K = 40, les écarts sont plus petits que le bruit entre deux exécutions,
# donc on prend le milieu du plateau plutôt que le minimum (qui change d'un lancement à l'autre)
REGLAGE_RETENU = {"t0": 2.0, "t1": 0.01, "K": 20}


# 8.1 Réglage : on fait varier UN paramètre à la fois autour du réglage retenu
#   (t0 de 0,05 à 8, puis t1, puis K), sur les 4 instances de réglage × 2 graines × 10 s.
# Plus simple qu'une grille complète (toutes les combinaisons seraient beaucoup trop longues),
# mais on ne voit pas les effets croisés entre paramètres.
def reglage():
    r = REGLAGE_RETENU
    liste = []
    for t0 in [0.05, 0.2, 0.5, 1.0, 2.0, 4.0, 8.0]:
        liste += essais_reglage(t0, r["t1"], r["K"])
    meilleure_valeur(lancer(liste, "reglage_t0.csv"), "t0")

    liste = []
    for t1 in [0.001, 0.01, 0.05]:
        liste += essais_reglage(r["t0"], t1, r["K"])
    meilleure_valeur(lancer(liste, "reglage_t1.csv"), "t1")

    liste = []
    for K in [5, 10, 20, 40]:
        liste += essais_reglage(r["t0"], r["t1"], K)
    meilleure_valeur(lancer(liste, "reglage_K.csv"), "K")


# Renvoie le réglage utilisé par toutes les autres expériences.
def reglage_choisi():
    return REGLAGE_RETENU


# 8.2 Ablation : on relance le solveur en RETIRANT un mouvement à la fois (sa probabilité passe à 0).
#   Si le gap augmente sans un mouvement, c'est que ce mouvement est utile.
#   « Descente seule (T = 0) » : on n'accepte plus que les améliorations ; la différence avec le
#   recuit complet montre ce qu'apporte la température.
def ablation():
    r = reglage_choisi()
    # (nom de la variante, numéro du mouvement retiré, t0, t1)
    variantes = [("tous les mouvements", None, r["t0"], r["t1"])]
    for k in range(len(NOMS_MOUVEMENTS)):
        variantes.append(("sans " + NOMS_MOUVEMENTS[k], k, r["t0"], r["t1"]))
    # descente seule : T = 0, on n'accepte que les améliorations
    variantes.append(("descente seule (T = 0)", None, 0, 0))

    liste = []
    for nom, sans, t0, t1 in variantes:
        for i in INSTANCES_REGLAGE + ["rc201", "r201"]:
            # "nouvelle tournée" n'est utilisé qu'avec des fenêtres de temps
            if sans == 4 and i.startswith("X-"):
                continue
            for g in GRAINES_REGLAGE:
                liste.append({"instance": i, "graine": g, "duree": DUREE_REGLAGE, "variante": nom,
                              "sans": sans, "t0": t0, "t1": t1, "K": r["K"]})
    lancer(liste, "ablation.csv")


# 8.3 Effet du temps de calcul : les mêmes instances avec 2, 5, 10, 20 et 40 secondes.
#   Comme la température dépend de la durée, chaque essai est un recuit complet (pas un recuit coupé).
def budget():
    r = reglage_choisi()
    liste = []
    for i in INSTANCES_REGLAGE:
        for duree in [2, 5, 10, 20, 40]:
            for g in GRAINES_REGLAGE:
                liste.append({"instance": i, "graine": g, "duree": duree,
                              "t0": r["t0"], "t1": r["t1"], "K": r["K"]})
    lancer(liste, "budget.csv")


# 8.4 Étude CVRP : 24 instances X (105 à 935 clients) × 3 graines, durée selon la taille.
#   Le nombre de camions n'est pas imposé, comme pour les meilleures solutions publiées.
def etude_cvrp():
    r = reglage_choisi()
    liste = []
    for i in INSTANCES_CVRP:
        n = int(i.split("-")[1][1:]) - 1   # "X-n106-k14" -> 105 clients
        for g in GRAINES_ETUDE:
            liste.append({"instance": i, "graine": g, "duree": duree_selon_taille(n),
                          "t0": r["t0"], "t1": r["t1"], "K": r["K"]})
    lancer(liste, "cvrp.csv")


# 8.5 Étude CVRPTW : les 56 instances de Solomon (100 clients) × 3 graines × 20 s.
def etude_cvrptw():
    r = reglage_choisi()
    liste = []
    for i in INSTANCES_CVRPTW:
        for g in GRAINES_ETUDE:
            liste.append({"instance": i, "graine": g, "duree": DUREE_CVRPTW,
                          "t0": r["t0"], "t1": r["t1"], "K": r["K"]})
    lancer(liste, "cvrptw.csv")


# 8.6 Grandes instances : clients tirés au hasard, jusqu'à 3000 clients.
#   On chronomètre chaque étape de la préparation (distances, voisins, Clarke et Wright), qui grandit
#   comme n², puis on mesure ce que le recuit gagne en 60 s par rapport à la solution de départ.
# (pas de meilleure solution connue : on compare à la solution de départ)
# on teste deux températures de départ : le réglage retenu et un départ plus froid
def une_taille(p):
    n, t0 = p
    random.seed(n)
    coords = [(500, 500)] + [(random.randint(0, 1000), random.randint(0, 1000)) for _ in range(n)]
    demandes = [0] + [random.randint(1, 20) for _ in range(n)]
    inst = {"nom": f"hasard-{n}", "coords": coords, "demandes": demandes, "Q": 200, "arrondi": True}

    # on chronomètre chaque étape de la préparation
    t = time.time()
    D = calcul_distances(coords, True)
    t_distances = time.time() - t
    t = time.time()
    voisins_proches(D, 20)
    t_voisins = time.time() - t
    t = time.time()
    clarke_wright(D, demandes, 200)
    t_depart = time.time() - t

    inst["D"] = D
    duree = 60
    res = resoudre(inst, duree=duree, graine=1, t0=t0)
    ligne = {
        "n": n,
        "t0": t0,
        "t_distances": round(t_distances, 2),
        "t_voisins": round(t_voisins, 2),
        "t_depart": round(t_depart, 2),
        "duree_recuit": duree,
        "cout_depart": res["cout_initial"],
        "cout": res["cout"],
        "gain_pct": round(100 * (res["cout_initial"] - res["cout"]) / res["cout_initial"], 2),
        "routes": len(res["routes"]),
        "iterations": res["iterations"],
        "valide": res["valide"],
    }
    print(" ", ligne, flush=True)
    return ligne


# Lance les 10 essais de taille (5 tailles × 2 températures) puis l'instance X-n1001-k43 (vrai gap).
def taille():
    liste = [(n, t0) for n in [250, 500, 1000, 2000, 3000] for t0 in [2.0, 0.2]]
    with Pool(NB_PROCESSUS) as pool:
        lignes = pool.map(une_taille, liste)
    with open(os.path.join("resultats", "taille.csv"), "w", newline="", encoding="utf-8") as f:
        ecrivain = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        ecrivain.writeheader()
        ecrivain.writerows(lignes)

    # et une grande instance de référence (1000 clients) pour avoir un vrai gap
    liste = [{"instance": "X-n1001-k43", "graine": g, "duree": 60, "t0": t0, "t1": 0.01, "K": 20}
             for t0 in [2.0, 0.2] for g in [1, 2]]
    lancer(liste, "grande.csv")


# Lancement : python experiences.py <étape> (ou « tout » pour toutes les étapes dans l'ordre).
if __name__ == "__main__":
    etapes = {"reglage": reglage, "ablation": ablation, "budget": budget,
              "cvrp": etude_cvrp, "cvrptw": etude_cvrptw, "taille": taille}
    choix = sys.argv[1] if len(sys.argv) > 1 else "tout"
    if choix == "tout":
        for etape in etapes.values():
            etape()
    else:
        etapes[choix]()
