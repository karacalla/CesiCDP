# partie 3 du notebook : jusqu'où peut aller la méthode exacte ?
# on compare le PLNE (PuLP + HiGHS, 120 s max) et le recuit (3 s, 3 graines)
# sur les m premiers clients de X-n101-k25, pour m = 6, 8, ..., 16
# résultat dans resultats/exact.csv

import csv
import os
import time

import pulp

from recuit_simple import lire_instance, calcul_distances, resoudre

TEMPS_MAX_PLNE = 120  # secondes
GRAINES = [1, 2, 3]
DUREE_RECUIT = 3  # secondes


# PLNE avec la formulation MTZ, résolu par HiGHS
def plne_simplifie(D, q, Q):
    n = len(D) - 1
    lieux = range(n + 1)
    clients = range(1, n + 1)

    # x[i, j] = 1 si un camion va directement de i à j
    # u[i] = charge déjà livrée en arrivant chez le client i
    prob = pulp.LpProblem("CVRP_simplifie", pulp.LpMinimize)
    x = {(i, j): prob.add_variable(f"x_{i}_{j}", cat="Binary")
         for i in lieux for j in lieux if i != j}
    u = {i: prob.add_variable(f"u_{i}", lowBound=q[i], upBound=Q) for i in clients}

    # objectif : minimiser la distance totale
    prob += pulp.lpSum(D[i][j] * x[i, j] for (i, j) in x)

    # chaque client a exactement un départ et une arrivée
    for i in clients:
        prob += pulp.lpSum(x[i, j] for j in lieux if j != i) == 1  # un départ de i
        prob += pulp.lpSum(x[j, i] for j in lieux if j != i) == 1  # une arrivée en i
    # autant de camions qui partent du dépôt que de camions qui reviennent
    prob += pulp.lpSum(x[0, j] for j in clients) == pulp.lpSum(x[i, 0] for i in clients)

    # contraintes MTZ (capacité + pas de sous-tours)
    for i in clients:
        for j in clients:
            if i != j:
                prob += u[i] - u[j] + Q * x[i, j] <= Q - q[j]

    debut = time.time()
    etat = prob.solve(pulp.HiGHS(msg=False, timeLimit=TEMPS_MAX_PLNE))
    temps = time.time() - debut
    # Optimal = le solveur a prouvé que c'est le meilleur ; sinon il s'est arrêté au temps max
    optimal = etat.status.name == "Optimal"
    nb_variables = len(x) + len(u)
    return pulp.value(prob.objective), temps, optimal, nb_variables


if __name__ == "__main__":
    complete = lire_instance(os.path.join("instances", "X-n101-k25.vrp"))
    lignes = []
    for m in [6, 8, 10, 12, 14, 16]:
        # petite instance : le dépôt + les m premiers clients
        petite = {
            "nom": f"X-n101-k25 ({m} clients)",
            "coords": complete["coords"][:m + 1],
            "demandes": complete["demandes"][:m + 1],
            "Q": complete["Q"],
            "arrondi": True,
        }
        D = calcul_distances(petite["coords"], True)

        # méthode exacte
        cout_plne, temps_plne, optimal, nb_var = plne_simplifie(D, petite["demandes"], petite["Q"])
        # recuit, avec plusieurs graines
        couts_sa, temps_sa = [], []
        for g in GRAINES:
            res = resoudre(petite, duree=DUREE_RECUIT, graine=g)
            couts_sa.append(res["cout"])
            temps_sa.append(res["temps"])

        ligne = {
            "m": m,
            "variables": nb_var,
            "cout_plne": round(cout_plne),
            "temps_plne_s": round(temps_plne, 2),
            "optimal_prouve": optimal,
            "cout_sa_meilleur": min(couts_sa),
            "cout_sa_moyen": round(sum(couts_sa) / len(couts_sa), 1),
            "temps_sa_s": round(sum(temps_sa) / len(temps_sa), 2),
        }
        print(ligne, flush=True)
        lignes.append(ligne)

    # écriture du csv relu par le notebook
    os.makedirs("resultats", exist_ok=True)
    with open(os.path.join("resultats", "exact.csv"), "w", newline="", encoding="utf-8") as f:
        ecrivain = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        ecrivain.writeheader()
        ecrivain.writerows(lignes)
