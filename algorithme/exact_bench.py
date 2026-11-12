# méthode exacte (PLNE avec PuLP + HiGHS) sur de petites instances, comparée au recuit
# on garde les m premiers clients d'une instance de référence :
#   - X-n101-k25 pour le CVRP (sans fenêtres)
#   - rc201 (Solomon) pour le CVRPTW (avec fenêtres de temps)
# résultats dans resultats/exact.csv
# python exact_bench.py      (testé avec PuLP 4 : pip install "pulp>=4.1" highspy)

import csv
import os
import sys
import time

import pulp

from recuit_simple import lire_instance, lire_instance_solomon, calcul_distances, resoudre

LIMITE = 60  # secondes laissées au solveur exact


# garde le dépôt et les m premiers clients
def sous_instance(inst, m):
    petite = {"nom": f"{inst['nom']}[{m}]", "coords": inst["coords"][:m + 1],
              "demandes": inst["demandes"][:m + 1], "Q": inst["Q"], "arrondi": inst["arrondi"]}
    if "fenetres" in inst:
        petite["fenetres"] = inst["fenetres"][:m + 1]
        petite["services"] = inst["services"][:m + 1]
    return petite


# PLNE : x[i, j] = 1 si un camion va de i à j, u[i] = charge livrée après le client i
# avec fenêtres : h[i] = heure de début de livraison chez i
def resoudre_plne(inst, limite):
    D = calcul_distances(inst["coords"], inst["arrondi"])
    q = inst["demandes"]
    Q = inst["Q"]
    n = len(q) - 1
    lieux = range(n + 1)
    clients = range(1, n + 1)

    prob = pulp.LpProblem("tournees", pulp.LpMinimize)
    x = {(i, j): prob.add_variable(f"x_{i}_{j}", cat="Binary") for i in lieux for j in lieux if i != j}
    u = {i: prob.add_variable(f"u_{i}", lowBound=q[i], upBound=Q) for i in clients}

    # objectif : distance totale
    prob += pulp.lpSum(D[i][j] * x[i, j] for (i, j) in x)
    for c in clients:
        prob += pulp.lpSum(x[c, j] for j in lieux if j != c) == 1   # on repart de chaque client
        prob += pulp.lpSum(x[i, c] for i in lieux if i != c) == 1   # on arrive chez chaque client
    # autant de retours au dépôt que de départs
    prob += pulp.lpSum(x[0, j] for j in clients) == pulp.lpSum(x[i, 0] for i in clients)
    # capacité : la charge augmente le long d'une tournée (interdit aussi les sous-tours)
    for i in clients:
        for j in clients:
            if i != j:
                prob += u[i] - u[j] + Q * x[i, j] <= Q - q[j]

    if "fenetres" in inst:
        fen = inst["fenetres"]
        s = inst["services"]
        # l'heure h[i] doit être dans la fenêtre du client
        h = {i: prob.add_variable(f"h_{i}", lowBound=fen[i][0], upBound=fen[i][1]) for i in clients}
        M = fen[0][1] + 1000
        for j in clients:
            # départ du dépôt à l'ouverture
            prob += h[j] >= fen[0][0] + D[0][j] - M * (1 - x[0, j])
            # retour au dépôt avant sa fermeture
            prob += h[j] + s[j] + D[j][0] <= fen[0][1] + M * (1 - x[j, 0])
            for i in clients:
                if i != j:
                    # si on va de i à j : heure chez j >= heure chez i + service + trajet
                    prob += h[j] >= h[i] + s[i] + D[i][j] - M * (1 - x[i, j])

    debut = time.time()
    prob.solve(pulp.HiGHS(msg=False, timeLimit=limite))
    duree = time.time() - debut
    cout = pulp.value(prob.objective)
    return cout, duree, len(x)


if __name__ == "__main__":
    cas = [("CVRP", lire_instance("instances/X-n101-k25.vrp"), [6, 8, 10, 12, 14, 16]),
           ("CVRPTW", lire_instance_solomon("solomon/rc201.txt"), [10, 20, 30, 40, 60, 80, 100])]
    # on peut ne lancer qu'un des deux problèmes : python exact_bench.py CVRPTW
    if len(sys.argv) > 1:
        cas = [c for c in cas if c[0] == sys.argv[1]]
    os.makedirs("resultats", exist_ok=True)
    fichier = "resultats/exact.csv"
    # on garde les lignes de l'autre problème si le fichier existe déjà
    lignes = []
    if os.path.exists(fichier):
        lignes = [l for l in csv.DictReader(open(fichier, encoding="utf-8"))
                  if l["probleme"] not in [c[0] for c in cas]]
    for probleme, base, tailles in cas:
        for m in tailles:
            inst = sous_instance(base, m)
            cout_plne, t_plne, nb_x = resoudre_plne(inst, LIMITE)
            # le recuit : 3 graines de 3 secondes
            couts = [resoudre(inst, duree=3, graine=g)["cout"] for g in (1, 2, 3)]
            ligne = {"probleme": probleme, "instance": base["nom"], "clients": m, "variables_x": nb_x,
                     "cout_plne": None if cout_plne is None else round(cout_plne, 1),
                     "temps_plne_s": round(t_plne, 1),
                     "optimal_prouve": t_plne < LIMITE - 1,
                     "cout_recuit_meilleur": round(min(couts), 1),
                     "cout_recuit_moyen": round(sum(couts) / 3, 1)}
            lignes.append(ligne)
            print(ligne, flush=True)
    with open(fichier, "w", newline="", encoding="utf-8") as f:
        ecrivain = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        ecrivain.writeheader()
        ecrivain.writerows(lignes)
