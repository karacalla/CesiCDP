# calcule les tournées sur la carte de France et écrit le fichier du site
#
# donnees/donnees_cvrp_france.json  (dépôt + 500 clients)
#     -> gen_carte.py (recuit de recuit_simple.py)
#     -> ../site/src/data/tournees.json  (lu par le site React)
#
# python gen_carte.py [durée en secondes, 60 par défaut]
#
# Rôle          : passer d'un jeu de référence (plan, unités abstraites) à des données GÉOGRAPHIQUES réelles
#                 (lat/lon en France) et produire un fichier lisible par le premier prototype du site
# Choix retenu  : distance à vol d'oiseau (haversine), matrice passée directement à resoudre() via inst["D"]
#                 -> le même recuit sert sans modification (il ne connaît que D)
# Alternative   : distance routière (OSRM / API d'itinéraire) : plus réaliste mais service externe, n² requêtes
#   écartée       ou une grosse matrice, et envoi des coordonnées des clients à un tiers (RGPD)
# Question jury : « pourquoi k_max ici et pas dans les expériences ? » -> ici la flotte est réelle (30 camions) ;
#                 dans le jeu X le nombre de camions est libre
# NB : tournees.json n'est plus lu par la version actuelle du site (qui tourne sur données simulées NANCY-60) ;
#      le branchement prévu est une API HTTP (voir site/docs/CONTRAT_SOLVEUR.md)

import json
import math
import os
import sys

from recuit_simple import resoudre, verifier, longueur, charge_de

os.chdir(os.path.dirname(os.path.abspath(__file__)))  # chemins relatifs au dossier algorithme/

FICHIER_DONNEES = os.path.join("donnees", "donnees_cvrp_france.json")
FICHIER_REGLAGE = os.path.join("resultats", "reglage_choisi.json")
FICHIER_SITE = os.path.join("..", "site", "src", "data", "tournees.json")


# distance en km entre deux points GPS (formule de haversine)
# on ne peut pas faire Pythagore sur des latitudes / longitudes car la Terre est ronde
# (1° de longitude = 111 km à l'équateur mais ≈ 73 km à Paris : cos(48,9°) × 111)
# haversine = distance du grand cercle sur une sphère de rayon R ; erreur < 0,5 % par rapport à l'ellipsoïde
def distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0  # rayon de la Terre
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


if __name__ == "__main__":
    duree = 60
    if len(sys.argv) > 1:
        duree = float(sys.argv[1])

    # 1) lecture des données (dépôt + clients)
    with open(FICHIER_DONNEES, encoding="utf-8") as f:
        donnees = json.load(f)
    depot = donnees["depot"]
    clients = donnees["clients"]
    # lieu 0 = dépôt, comme dans recuit_simple
    lieux = [depot] + clients
    # demandes[0] = 0 car le dépôt ne demande rien
    demandes = [0]
    for c in clients:
        demandes.append(c["demand"])
    Q = donnees["vehicleCapacity"]
    k_max = donnees["vehicleCount"]
    print(f"{len(clients)} clients, capacité {Q}, au plus {k_max} camions")

    # 2) matrice des distances en km entre tous les lieux
    D = []
    for a in lieux:
        ligne = []
        for b in lieux:
            ligne.append(distance_km(a["lat"], a["lon"], b["lat"], b["lon"]))
        D.append(ligne)

    # 3) le recuit
    # réglage choisi par experiences.py (sinon valeurs par défaut)
    reglage = {"t0": 0.5, "t1": 0.01, "K": 20}
    if os.path.exists(FICHIER_REGLAGE):
        with open(FICHIER_REGLAGE) as f:
            reglage = json.load(f)
    instance = {"nom": donnees["name"], "demandes": demandes, "Q": Q, "D": D}
    res = resoudre(instance, duree=duree, graine=1, k_max=k_max, verbose=True,
                   t0=reglage["t0"], t1=reglage["t1"], K=reglage["K"])

    # 4) on vérifie la solution avant d'écrire quoi que ce soit
    ok, message = verifier(res["routes"], demandes, Q, k_max)
    print("vérification :", message)
    if not ok:
        sys.exit("solution non valable : le fichier du site n'est pas modifié")

    # 5) on met les tournées au format attendu par le site
    tournees = []
    numero = 1
    for tournee in res["routes"]:
        # clients dans l'ordre de passage du camion
        liste_clients = []
        for c in tournee:
            lieu = lieux[c]
            liste_clients.append({"id": lieu["id"], "nom": lieu["name"], "lat": lieu["lat"],
                                  "lon": lieu["lon"], "demande": lieu["demand"]})
        tournees.append({
            "id": numero,
            "km": round(longueur(tournee, D), 1),
            "charge": charge_de(tournee, demandes),
            "clients": liste_clients,
        })
        numero += 1

    # 6) on écrit tournees.json pour le site
    sortie = {
        "nom": donnees["name"],
        "depot": {"nom": depot["name"], "lat": depot["lat"], "lon": depot["lon"]},
        "capacite": Q,
        "nb_clients": len(clients),
        "km_depart": round(res["cout_initial"], 1),  # Clarke et Wright
        "km_total": round(res["cout"], 1),  # après le recuit
        "duree_calcul_s": duree,
        "tournees": tournees,
    }
    os.makedirs(os.path.dirname(FICHIER_SITE), exist_ok=True)
    with open(FICHIER_SITE, "w", encoding="utf-8") as f:
        json.dump(sortie, f, ensure_ascii=False, indent=1)

    # petit résumé dans la console
    gain = 100 * (res["cout_initial"] - res["cout"]) / res["cout_initial"]
    print(f"{len(tournees)} camions, {res['cout']:.0f} km "
          f"(départ : {res['cout_initial']:.0f} km, soit {gain:.1f} % de moins)")
    print("fichier écrit :", FICHIER_SITE)
