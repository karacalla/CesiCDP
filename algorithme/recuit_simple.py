# Recuit simulé pour le CVRP (camions avec capacité) et le CVRPTW (capacité + fenêtres de temps)
# dépôt = lieu 0, clients = 1..n, chaque camion porte au plus Q
# avec fenêtres : le client i doit être livré entre a_i et b_i ; si le camion arrive
# avant a_i il attend, s'il arrive après b_i la tournée est interdite
#
# plan du fichier :
#   1. lecture d'une instance avec vrplib (.vrp sans fenêtres, .txt de Solomon avec fenêtres)
#   2. distances et voisins proches
#   3. solution de départ (Clarke et Wright)
#   4. fonctions utiles (longueur, charge, horaires, vérification)
#   5. les 5 mouvements
#   6. le recuit + resoudre() qui enchaîne tout
#
# exemples : python recuit_simple.py instances/X-n101-k25.vrp
#            python recuit_simple.py solomon/r101.txt

import math
import random
import time

import vrplib   # lecture des fichiers d'instances : pip install vrplib


# ---------- 1. lecture d'une instance ----------

# lit une instance avec la bibliothèque vrplib ; le dépôt devient le lieu 0 et les clients 1..n
#   - fichier .vrp : instance sans fenêtres de temps (CVRP)
#   - fichier .txt : instance de Solomon, avec fenêtres de temps (CVRPTW)
def lire_instance(chemin):
    if chemin.endswith(".txt"):
        donnees = vrplib.read_instance(chemin, instance_format="solomon", compute_edge_weights=False)
    else:
        donnees = vrplib.read_instance(chemin, compute_edge_weights=False)

    # vrplib renvoie des tableaux numpy : on les transforme en listes Python ordinaires
    inst = {
        "nom": donnees["name"],
        "coords": [(float(x), float(y)) for x, y in donnees["node_coord"]],
        "demandes": [int(d) for d in donnees["demand"]],   # demandes[0] = 0 pour le dépôt
        "Q": int(donnees["capacity"]),
        # façon d'arrondir les distances : entier le plus proche pour les fichiers .vrp
        "arrondi": True,
    }
    if "time_window" in donnees:
        # fenetres[i] = (a_i, b_i) ; fenetres[0] = horaires d'ouverture du dépôt
        inst["fenetres"] = [(float(a), float(b)) for a, b in donnees["time_window"]]
        # durée de la livraison chez chaque client
        inst["services"] = [float(s) for s in donnees["service_time"]]
        # convention des instances de Solomon : distances coupées à 1 décimale
        inst["arrondi"] = "dixieme"
    return inst


# ---------- 2. distances et voisins proches ----------

# matrice des distances : D[i][j] = distance entre le lieu i et le lieu j
# arrondi = True : entier le plus proche (instances .vrp)
# arrondi = "dixieme" : coupé à 1 décimale (instances de Solomon), False : rien
def calcul_distances(coords, arrondi=True):
    nb_lieux = len(coords)
    D = []
    for i in range(nb_lieux):
        ligne = []
        for j in range(nb_lieux):
            dx = coords[i][0] - coords[j][0]
            dy = coords[i][1] - coords[j][1]
            # Pythagore
            d = math.sqrt(dx * dx + dy * dy)
            if arrondi == "dixieme":
                d = math.floor(d * 10) / 10
            elif arrondi:
                d = math.floor(d + 0.5)  # convention EUC_2D
            ligne.append(d)
        D.append(ligne)
    return D


# pour chaque client, ses K clients les plus proches (voisins[0] = dépôt, vide)
# le recuit ne teste que des mouvements entre voisins proches : ça évite de perdre
# du temps à échanger deux clients qui sont aux deux bouts de la carte
def voisins_proches(D, K):
    n = len(D) - 1
    # on ne peut pas avoir plus de n-1 voisins
    K = min(K, n - 1)
    voisins = [[]]
    for i in range(1, n + 1):
        autres = [j for j in range(1, n + 1) if j != i]
        # tri du plus proche au plus loin, on garde les K premiers
        autres.sort(key=lambda j: D[i][j])
        voisins.append(autres[:K])
    return voisins


# ---------- 3. solution de départ : Clarke et Wright ----------

# on fusionne les tournées dans l'ordre des plus grosses économies
# s(i, j) = D[0][i] + D[0][j] - D[i][j] tant que la capacité est respectée
# (et les fenêtres de temps, s'il y en a)
def clarke_wright(D, demandes, Q, fenetres=None, services=None):
    n = len(D) - 1

    # au début chaque client a sa propre tournée
    tournees = {i: [i] for i in range(1, n + 1)}
    charge = {i: demandes[i] for i in range(1, n + 1)}
    ou = list(range(n + 1))  # ou[c] = numéro de la tournée du client c

    # économies sur tous les couples i < j ((i, j) et (j, i) c'est pareil)
    economies = []
    for i in range(1, n + 1):
        for j in range(i + 1, n + 1):
            s = D[0][i] + D[0][j] - D[i][j]
            if s > 0:
                economies.append((s, i, j))
    # on traite les plus grosses économies en premier
    economies.sort(reverse=True)

    for s, i, j in economies:
        ti = ou[i]
        tj = ou[j]
        # déjà dans la même tournée, ou camion trop chargé -> on passe
        if ti == tj:
            continue
        if charge[ti] + charge[tj] > Q:
            continue

        A = tournees[ti]
        B = tournees[tj]
        # i et j doivent être chacun à un bout de leur tournée
        if i not in (A[0], A[-1]) or j not in (B[0], B[-1]):
            continue
        # on met i à la fin de A et j au début de B (en retournant si besoin)
        if A[-1] != i:
            A = A[::-1]
        if B[0] != j:
            B = B[::-1]
        fusion = A + B

        if fenetres is not None:
            # avec des fenêtres le sens de parcours compte : on essaie les deux sens
            if not horaires_ok(fusion, D, fenetres, services):
                fusion = fusion[::-1]
                if not horaires_ok(fusion, D, fenetres, services):
                    continue

        # fusion acceptée : la tournée tj disparaît
        tournees[ti] = fusion
        charge[ti] += charge[tj]
        for c in tournees[tj]:
            ou[c] = ti
        del tournees[tj]
        del charge[tj]

    return list(tournees.values())


# s'il y a plus de tournées que de camions, on vide la moins chargée
# et on remet ses clients là où ça rallonge le moins
def reduire_nb_tournees(tournees, D, demandes, Q, k_max, fenetres=None, services=None):
    tournees = [t[:] for t in tournees]
    while len(tournees) > k_max:
        # on enlève la tournée la moins chargée
        tournees.sort(key=lambda t: charge_de(t, demandes))
        petite = tournees.pop(0)

        for c in petite:
            meilleur = None  # (rallonge, tournée, position)
            # on cherche la tournée et la position où c rallonge le moins le trajet
            for t in tournees:
                if charge_de(t, demandes) + demandes[c] > Q:
                    continue
                # on teste toutes les positions possibles (0 = dépôt aux deux bouts)
                for p in range(len(t) + 1):
                    if p > 0:
                        avant = t[p - 1]
                    else:
                        avant = 0
                    if p < len(t):
                        apres = t[p]
                    else:
                        apres = 0
                    rallonge = D[avant][c] + D[c][apres] - D[avant][apres]
                    if meilleur is not None and rallonge >= meilleur[0]:
                        continue
                    # avec des fenêtres, il faut que la tournée reste à l'heure
                    if fenetres is not None and not horaires_ok(t[:p] + [c] + t[p:], D, fenetres, services):
                        continue
                    meilleur = (rallonge, t, p)
            if meilleur is None:
                raise ValueError(f"impossible de tout livrer avec {k_max} camions")
            # on insère c au meilleur endroit trouvé
            meilleur[1].insert(meilleur[2], c)
    return tournees


# ---------- 4. fonctions utiles ----------

# longueur d'une tournée : dépôt -> clients -> dépôt
def longueur(tournee, D):
    if len(tournee) == 0:
        return 0
    # dépôt -> premier client, puis client -> client, puis dernier client -> dépôt
    total = D[0][tournee[0]]
    for k in range(len(tournee) - 1):
        total += D[tournee[k]][tournee[k + 1]]
    total += D[tournee[-1]][0]
    return total


# quantité totale livrée par une tournée
def charge_de(tournee, demandes):
    total = 0
    for c in tournee:
        total += demandes[c]
    return total


# vrai si la tournée respecte toutes les fenêtres de temps
# le camion part du dépôt à l'ouverture ; le temps de trajet = la distance
def horaires_ok(tournee, D, fenetres, services):
    heure = fenetres[0][0]
    avant = 0
    for c in tournee:
        heure += D[avant][c]            # on roule jusqu'au client c
        if heure > fenetres[c][1]:
            return False                # arrivé après la fermeture : interdit
        if heure < fenetres[c][0]:
            heure = fenetres[c][0]      # arrivé trop tôt : on attend l'ouverture
        heure += services[c]            # durée de la livraison
        avant = c
    # il faut aussi être rentré au dépôt avant sa fermeture
    return heure + D[avant][0] <= fenetres[0][1]


# détail des horaires d'une tournée : pour chaque client (arrivée, attente, départ)
def horaires(tournee, D, fenetres, services):
    resultat = []
    heure = fenetres[0][0]
    avant = 0
    for c in tournee:
        arrivee = heure + D[avant][c]
        attente = max(0, fenetres[c][0] - arrivee)
        heure = arrivee + attente + services[c]
        resultat.append((arrivee, attente, heure))
        avant = c
    return resultat


# coût d'une solution = somme des longueurs des tournées
def cout_total(tournees, D):
    total = 0
    for t in tournees:
        total += longueur(t, D)
    return total


# vérifie qu'une solution est correcte, renvoie (True/False, message)
def verifier(tournees, demandes, Q, k_max=None, D=None, fenetres=None, services=None):
    n = len(demandes) - 1
    # chaque client doit apparaître exactement une fois
    tous = []
    for t in tournees:
        tous += t
    if sorted(tous) != list(range(1, n + 1)):
        return False, "un client est absent ou apparaît plusieurs fois"
    # aucun camion ne dépasse la capacité
    for t in tournees:
        if charge_de(t, demandes) > Q:
            return False, "capacité dépassée"
    # pas plus de camions qu'autorisé
    if k_max is not None and len(tournees) > k_max:
        return False, "trop de camions"
    # toutes les fenêtres de temps sont respectées
    if fenetres is not None:
        for t in tournees:
            if not horaires_ok(t, D, fenetres, services):
                return False, "fenêtre de temps non respectée"
    return True, "solution valable"


# ---------- 5. les 5 mouvements ----------
# chaque mouvement renvoie {numéro de tournée: nouvelle tournée} sans modifier
# la solution, ou None si le mouvement n'a pas de sens

# déplacer : on enlève u et on le remet juste avant ou juste après v (au hasard)
def deplacer(tournees, tu, pu, tv, pv):
    u = tournees[tu][pu]
    v = tournees[tv][pv]
    decalage = random.randint(0, 1)  # 0 = avant v, 1 = après v
    # même tournée : on enlève u puis on le remet à côté de v
    if tu == tv:
        nouvelle = tournees[tu][:]
        nouvelle.remove(u)
        nouvelle.insert(nouvelle.index(v) + decalage, u)
        return {tu: nouvelle}
    # deux tournées différentes : u sort de la sienne et va dans celle de v
    nouvelle_u = tournees[tu][:pu] + tournees[tu][pu + 1:]
    nouvelle_v = tournees[tv][:pv + decalage] + [u] + tournees[tv][pv + decalage:]
    return {tu: nouvelle_u, tv: nouvelle_v}


# échanger : u et v échangent leur place (même tournée ou pas)
def echanger(tournees, tu, pu, tv, pv):
    u = tournees[tu][pu]
    v = tournees[tv][pv]
    if tu == tv:
        nouvelle = tournees[tu][:]
        nouvelle[pu] = v
        nouvelle[pv] = u
        return {tu: nouvelle}
    nouvelle_u = tournees[tu][:]
    nouvelle_v = tournees[tv][:]
    nouvelle_u[pu] = v
    nouvelle_v[pv] = u
    return {tu: nouvelle_u, tv: nouvelle_v}


# 2-opt : on retourne le morceau entre u et v (même tournée)
def deux_opt(tournees, tu, pu, tv, pv):
    if tu != tv:
        return None
    # ce mouvement ne marche que dans une seule tournée
    i = min(pu, pv)
    j = max(pu, pv)
    # morceau trop court, rien ne changerait
    if j - i < 2:
        return None
    t = tournees[tu]
    # début jusqu'à i + morceau de i+1 à j retourné + fin
    milieu = t[i + 1:j + 1]
    milieu.reverse()
    return {tu: t[:i + 1] + milieu + t[j + 1:]}


# 2-opt* entre deux tournées A = début_A u | fin_A et B = début_B v | fin_B
#   version 1 : on échange les fins  -> début_A u fin_B   et   début_B v fin_A
#   version 2 : on relie u à v       -> début_A u v (début_B à l'envers)
#                                       et (fin_A à l'envers) fin_B
# une des nouvelles tournées peut être vide : le recuit la supprime
def deux_opt_etoile(tournees, tu, pu, tv, pv):
    if tu == tv:
        return None
    A = tournees[tu]
    B = tournees[tv]
    if random.random() < 0.5:
        nouvelle_A = A[:pu + 1] + B[pv + 1:]
        nouvelle_B = B[:pv + 1] + A[pu + 1:]
    else:
        debut_B = B[:pv + 1]
        debut_B.reverse()
        fin_A = A[pu + 1:]
        fin_A.reverse()
        nouvelle_A = A[:pu + 1] + debut_B
        nouvelle_B = fin_A + B[pv + 1:]
    return {tu: nouvelle_A, tv: nouvelle_B}


# nouvelle tournée : u quitte sa tournée et part seul avec un camion de plus
# (la nouvelle tournée porte le numéro len(tournees) : le recuit l'ajoute au bout de la liste)
# utile surtout avec des fenêtres de temps, quand un client gêne tous les autres
def nouvelle_tournee(tournees, tu, pu, tv, pv):
    if len(tournees[tu]) == 1:
        return None  # u est déjà seul
    u = tournees[tu][pu]
    return {tu: tournees[tu][:pu] + tournees[tu][pu + 1:], len(tournees): [u]}


# liste des mouvements et probabilité de tirer chacun (même ordre)
MOUVEMENTS = [deplacer, echanger, deux_opt, deux_opt_etoile, nouvelle_tournee]
NOMS_MOUVEMENTS = ["déplacer", "échanger", "2-opt", "2-opt*", "nouvelle tournée"]
# sans fenêtres de temps : on n'utilise pas "nouvelle tournée" (un client seul dans un
# camion ne peut souvent plus être repris par un autre camion déjà presque plein)
PROBAS_DEFAUT = [0.4, 0.2, 0.2, 0.2, 0.0]
# avec fenêtres de temps : on l'utilise rarement (1 fois sur 200), ça suffit (partie 8.2)
PROBAS_FENETRES = [0.395, 0.2, 0.2, 0.2, 0.005]


# tire le numéro d'un mouvement au hasard en respectant les probabilités
# ex : [0.4, 0.2, 0.2, 0.2] -> 0 dans 40 % des cas, 1 dans 20 % ...
def tirer_mouvement(probas):
    x = random.random() * sum(probas)
    total = 0
    for m in range(len(probas)):
        total += probas[m]
        if x < total:
            return m
    return len(probas) - 1


# remet à jour ou[c] = numéro de la tournée qui contient le client c
def numeroter(tournees, ou):
    for numero in range(len(tournees)):
        for c in tournees[numero]:
            ou[c] = numero


# ---------- 6. le recuit simulé ----------

# améliore la solution pendant `duree` secondes
# à chaque tour : on tire u, un voisin v et un mouvement, on calcule delta,
# on accepte si ça raccourcit, sinon avec la proba exp(-delta / T)
# T baisse de T_debut à T_fin au cours du temps
# s'il y a des fenêtres de temps, un mouvement qui met un camion en retard est refusé
def recuit(tournees, D, demandes, Q, voisins, duree, T_debut, T_fin,
           probas=PROBAS_DEFAUT, pas_historique=0.5, verbose=False,
           fenetres=None, services=None, k_max=None):
    n = len(D) - 1
    # on copie pour ne pas modifier la solution de départ
    tournees = [t[:] for t in tournees]
    # on garde la longueur et la charge de chaque tournée pour ne pas tout recalculer
    longueurs = [longueur(t, D) for t in tournees]
    charges = [charge_de(t, demandes) for t in tournees]
    ou = [0] * (n + 1)
    numeroter(tournees, ou)

    # on retient toujours la meilleure solution vue
    cout = sum(longueurs)
    meilleur_cout = cout
    meilleures_tournees = [t[:] for t in tournees]

    # stats : nb de fois où chaque mouvement est accepté + évolution du coût
    acceptes = [0] * len(MOUVEMENTS)
    historique = []  # (temps, coût, meilleur coût, T)
    iterations = 0
    T = T_debut
    debut = time.time()
    prochain_point = 0.0

    while True:
        # on ne regarde l'heure que toutes les 500 itérations
        if iterations % 500 == 0:
            ecoule = time.time() - debut
            if ecoule >= duree:
                break
            # baisse géométrique de la température (T = 0 -> simple descente)
            if T_debut > 0 and T_fin > 0:
                T = T_debut * (T_fin / T_debut) ** (ecoule / duree)
            else:
                T = 0
            # on note un point de l'historique toutes les pas_historique secondes
            if ecoule >= prochain_point:
                historique.append((ecoule, cout, meilleur_cout, T))
                prochain_point += pas_historique
                if verbose:
                    print(f"  t={ecoule:5.1f}s  T={T:8.2f}  actuel={cout:.0f}  meilleur={meilleur_cout:.0f}")
        iterations += 1

        # 1) on tire u, un de ses voisins proches v, et un mouvement
        u = random.randint(1, n)
        if len(voisins[u]) == 0:
            break  # un seul client : aucun mouvement possible
        v = random.choice(voisins[u])
        m = tirer_mouvement(probas)

        # tournée et position de u et v
        tu = ou[u]
        tv = ou[v]
        pu = tournees[tu].index(u)
        pv = tournees[tv].index(v)

        # le mouvement renvoie les tournées modifiées sans toucher la solution
        proposition = MOUVEMENTS[m](tournees, tu, pu, tv, pv)
        if proposition is None:
            continue
        # le mouvement "nouvelle tournée" est interdit s'il n'y a plus de camion libre
        if len(tournees) in proposition and k_max is not None and len(tournees) >= k_max:
            continue

        # 2) on vérifie la capacité
        nouvelles_charges = {}
        trop_charge = False
        for numero in proposition:
            nouvelles_charges[numero] = charge_de(proposition[numero], demandes)
            if nouvelles_charges[numero] > Q:
                trop_charge = True
        if trop_charge:
            continue

        # 3) delta = nouveau coût - ancien coût, seulement sur les tournées qui changent
        nouvelles_longueurs = {}
        delta = 0
        for numero in proposition:
            nouvelles_longueurs[numero] = longueur(proposition[numero], D)
            if numero < len(tournees):
                delta += nouvelles_longueurs[numero] - longueurs[numero]
            else:
                delta += nouvelles_longueurs[numero]  # tournée qui n'existait pas avant

        # 4) on accepte si ça raccourcit, sinon avec une probabilité exp(-delta / T)
        if delta <= 0:
            accepte = True
        elif T > 0:
            accepte = random.random() < math.exp(-delta / T)
        else:
            accepte = False
        if not accepte:
            continue

        # 5) fenêtres de temps : on les vérifie en dernier car c'est le test le plus long
        if fenetres is not None:
            a_l_heure = True
            for numero in proposition:
                if not horaires_ok(proposition[numero], D, fenetres, services):
                    a_l_heure = False
                    break
            if not a_l_heure:
                continue

        # 6) on applique le changement
        tournee_vide = False
        for numero in sorted(proposition):
            if numero == len(tournees):
                # nouvelle tournée : on l'ajoute au bout des listes
                tournees.append([])
                longueurs.append(0)
                charges.append(0)
            tournees[numero] = proposition[numero]
            longueurs[numero] = nouvelles_longueurs[numero]
            charges[numero] = nouvelles_charges[numero]
            for c in tournees[numero]:
                ou[c] = numero
            if len(tournees[numero]) == 0:
                tournee_vide = True
        cout += delta
        acceptes[m] += 1

        # une tournée vide = un camion en moins
        if tournee_vide:
            garder = [k for k in range(len(tournees)) if len(tournees[k]) > 0]
            tournees = [tournees[k] for k in garder]
            longueurs = [longueurs[k] for k in garder]
            charges = [charges[k] for k in garder]
            numeroter(tournees, ou)

        # nouvelle meilleure solution ?
        if cout < meilleur_cout - 1e-9:
            meilleur_cout = cout
            meilleures_tournees = [t[:] for t in tournees]

    historique.append((time.time() - debut, cout, meilleur_cout, T))
    return meilleures_tournees, meilleur_cout, iterations, historique, acceptes


# t0 et t1 sont en fraction de la longueur moyenne d'un trajet
# (si inst contient déjà "D", on l'utilise : c'est le cas dans gen_carte.py)
# fait tout : distances, solution de départ, recuit, vérification
def resoudre(inst, duree=10.0, graine=0, K=20, t0=2.0, t1=0.01,
             probas=None, k_max=None, verbose=False):
    debut = time.time()
    # même graine = mêmes tirages au hasard, pour pouvoir refaire une expérience
    random.seed(graine)
    demandes = inst["demandes"]
    Q = inst["Q"]
    n = len(demandes) - 1
    # None s'il n'y a pas de fenêtres de temps (CVRP simple)
    fenetres = inst.get("fenetres")
    services = inst.get("services")
    # probabilités des mouvements : elles dépendent de la présence de fenêtres de temps
    if probas is None:
        if fenetres is None:
            probas = PROBAS_DEFAUT
        else:
            probas = PROBAS_FENETRES

    # étape 1 : distances et voisins proches
    if "D" in inst:
        D = inst["D"]
    else:
        D = calcul_distances(inst["coords"], inst["arrondi"])
    voisins = voisins_proches(D, K)

    # étape 2 : solution de départ avec Clarke et Wright
    depart = clarke_wright(D, demandes, Q, fenetres, services)
    if k_max is not None and len(depart) > k_max:
        depart = reduire_nb_tournees(depart, D, demandes, Q, k_max, fenetres, services)
    cout_depart = cout_total(depart, D)

    # étape 3 : températures, proportionnelles à la longueur moyenne d'un trajet
    # (n clients + un retour au dépôt par tournée = nombre de trajets)
    trajet_moyen = cout_depart / (n + len(depart))
    T_debut = t0 * trajet_moyen
    T_fin = t1 * trajet_moyen

    # étape 4 : le recuit
    if verbose:
        print(f"{inst['nom']} : départ = {cout_depart:.0f} ({len(depart)} tournées)")
    tournees, cout, iterations, historique, acceptes = recuit(
        depart, D, demandes, Q, voisins, duree, T_debut, T_fin, probas, verbose=verbose,
        fenetres=fenetres, services=services, k_max=k_max)

    # étape 5 : on vérifie et on recalcule le coût depuis zéro
    valide, message = verifier(tournees, demandes, Q, k_max, D, fenetres, services)
    cout_recalcule = cout_total(tournees, D)

    return {
        "nom": inst["nom"],
        "n": n,
        "cout": cout_recalcule,
        "routes": tournees,
        "valide": valide,
        "message": message,
        "cout_initial": cout_depart,
        "routes_initiales": depart,
        "iterations": iterations,
        "temps": time.time() - debut,
        "historique": historique,
        "acceptes": acceptes,
        # 0 avec des distances entières ; ~1e-10 avec des km à virgule (arrondis)
        "ecart_suivi": abs(cout - cout_recalcule),
    }


# petit test : python recuit_simple.py
if __name__ == "__main__":
    import sys
    chemin = "instances/X-n101-k25.vrp"
    if len(sys.argv) > 1:
        chemin = sys.argv[1]
    instance = lire_instance(chemin)
    resultat = resoudre(instance, duree=10, graine=1, verbose=True)
    print("solution :", resultat["message"])
    print(f"départ (Clarke et Wright) : {resultat['cout_initial']:.0f}")
    print(f"après recuit              : {resultat['cout']:.0f}")
    print(f"{len(resultat['routes'])} tournées, {resultat['iterations']} itérations")
