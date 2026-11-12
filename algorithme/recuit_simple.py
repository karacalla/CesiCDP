# =====================================================================================================
# recuit_simple.py : le solveur du projet (recuit simulé)
# =====================================================================================================
#
# EN BREF
#   Un dépôt (le lieu 0), des clients (lieux 1 à n), des camions qui portent chacun au plus Q.
#   On cherche des tournées « dépôt -> clients -> dépôt » qui livrent chaque client une seule fois,
#   sans surcharger un camion, et dont la longueur totale est la plus petite possible.
#   - CVRP (niveau B)   : seulement la capacité ;
#   - CVRPTW (niveau A) : en plus, chaque client a une fenêtre de temps [a_i, b_i]. Un camion en avance
#                         attend l'ouverture ; un camion qui arriverait après b_i n'a pas le droit de livrer.
#
# LA MÉTHODE EN 3 PHRASES
#   1. On construit vite une bonne solution de départ (algorithme des économies de Clarke et Wright).
#   2. On la modifie un tout petit peu, des millions de fois (déplacer un client, en échanger deux...).
#   3. On garde les modifications qui raccourcissent ; on garde AUSSI parfois celles qui rallongent
#      (c'est le « recuit simulé ») pour ne pas rester bloqué dans une solution moyenne.
#
# ORGANISATION DU FICHIER
#   1. lire une instance (.vrp sans fenêtres, .txt de Solomon avec fenêtres)
#   2. distances entre tous les lieux, et liste des voisins proches de chaque client
#   3. solution de départ (Clarke et Wright)
#   4. petites fonctions utiles (longueur, charge, horaires, vérification)
#   5. les 5 « mouvements » (les petites modifications)
#   6. le recuit, puis resoudre() qui enchaîne tout
#
# ESSAYER
#   python recuit_simple.py instances/X-n101-k25.vrp   (CVRP, 10 s)
#   python recuit_simple.py solomon/c101.txt           (CVRPTW, 10 s, trouve l'optimum 827,3)
#
# Aucune bibliothèque externe : seulement math, random et time (rien à installer, tout est lisible).
# =====================================================================================================

import math
import random
import time


# ---------- 1. lecture d'une instance ----------

# Lit un fichier .vrp (format VRPLIB des instances X d'Uchoa).
# Le fichier contient un en-tête « CLE : valeur » puis des sections :
#   NODE_COORD_SECTION (coordonnées), DEMAND_SECTION (demandes), DEPOT_SECTION (numéro du dépôt).
# Dans le fichier les lieux sont numérotés à partir de 1 ; ici le dépôt devient le lieu 0 et les
# clients 1..n, ce qui permet d'écrire D[0][i] pour « du dépôt au client i ».
# Renvoie un dictionnaire : nom, coordonnées, demandes, capacité Q, et la règle d'arrondi des distances.
def lire_instance(chemin):
    nom = ""
    capacite = 0
    type_distance = "EUC_2D"
    coords = []
    demandes = []
    section = None

    with open(chemin, encoding="utf-8") as fichier:
        for ligne in fichier:
            ligne = ligne.strip()
            if ligne == "" or ligne == "EOF":
                continue

            # en-tête du fichier : lignes "CLE : valeur"
            if ":" in ligne:
                cle, valeur = ligne.split(":", 1)
                cle = cle.strip()
                valeur = valeur.strip()
                if cle == "NAME":
                    nom = valeur
                elif cle == "CAPACITY":
                    capacite = int(valeur)
                elif cle == "EDGE_WEIGHT_TYPE":
                    type_distance = valeur
                continue

            # on change de section (coordonnées, demandes, dépôt)
            if ligne.endswith("_SECTION"):
                section = ligne
                continue

            # sinon c'est une ligne de données de la section en cours
            morceaux = ligne.split()
            if section == "NODE_COORD_SECTION":
                coords.append((float(morceaux[1]), float(morceaux[2])))
            elif section == "DEMAND_SECTION":
                demandes.append(int(morceaux[1]))
            elif section == "DEPOT_SECTION":
                # on suppose que le dépôt est le lieu 1, sinon la numérotation est fausse
                # (-1 marque seulement la fin de la section)
                if morceaux[0] not in ("1", "-1"):
                    raise ValueError("le dépôt doit être le lieu numéro 1")

    # coords[i] = (x, y) du lieu i, demandes[0] = 0 pour le dépôt
    # "arrondi" : les instances EUC_2D arrondissent chaque distance à l'entier (sinon nos coûts ne
    # seraient pas comparables aux meilleurs coûts publiés)
    return {
        "nom": nom,
        "coords": coords,
        "demandes": demandes,
        "Q": capacite,
        "arrondi": type_distance == "EUC_2D",
    }


# Lit un fichier de Solomon (.txt) : les mêmes informations + les fenêtres de temps.
# Chaque lieu est une ligne de 7 nombres :
#   numéro, x, y, demande, début de fenêtre a, fin de fenêtre b, durée de livraison s
# La première de ces lignes est le dépôt ; sa « fenêtre » donne ses horaires d'ouverture.
# Dans ces instances, le temps de trajet est égal à la distance (vitesse 1).
def lire_instance_solomon(chemin):
    with open(chemin, encoding="utf-8") as fichier:
        lignes = [ligne.split() for ligne in fichier if ligne.strip() != ""]
    nom = lignes[0][0]
    coords = []
    demandes = []
    fenetres = []
    services = []
    capacite = 0
    for k in range(len(lignes)):
        morceaux = lignes[k]
        # la ligne qui suit "NUMBER CAPACITY" donne le nombre de camions et la capacité
        if morceaux[0] == "NUMBER":
            capacite = int(lignes[k + 1][1])
        # une ligne de 7 nombres = un lieu (la première est le dépôt)
        if len(morceaux) == 7 and morceaux[0].isdigit():
            coords.append((float(morceaux[1]), float(morceaux[2])))
            demandes.append(int(float(morceaux[3])))
            fenetres.append((float(morceaux[4]), float(morceaux[5])))
            services.append(float(morceaux[6]))
    return {
        "nom": nom,
        "coords": coords,
        "demandes": demandes,
        "Q": capacite,
        # convention des instances de Solomon sur CVRPLIB : distances coupées à 1 décimale
        "arrondi": "dixieme",
        "fenetres": fenetres,   # fenetres[i] = (a_i, b_i) ; fenetres[0] = horaires du dépôt
        "services": services,   # durée de la livraison chez chaque client
    }


# ---------- 2. distances et voisins proches ----------

# Calcule une fois pour toutes la « matrice des distances » : D[i][j] = distance du lieu i au lieu j.
# Distance à vol d'oiseau sur le plan (théorème de Pythagore), puis la règle d'arrondi de l'instance :
#   arrondi = True      -> entier le plus proche (instances X)
#   arrondi = "dixieme" -> coupé à 1 décimale (instances de Solomon)
#   arrondi = False     -> aucun arrondi
# Pourquoi tout calculer d'avance ? Le recuit lit ces distances des millions de fois : les lire dans
# un tableau est immédiat, les recalculer à chaque fois serait beaucoup plus lent.
# Coût : n² cases (1 million pour 1000 clients) : c'est ce qui limite la taille des instances.
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


# Pour chaque client, la liste de ses K clients les plus proches (voisins[0] = dépôt, liste vide).
# Idée : dans une bonne solution, un client est presque toujours relié à des clients proches. Le recuit
# ne tente donc que des modifications entre un client et un de ses voisins proches : il ne perd pas
# son temps à rapprocher deux clients situés aux deux bouts de la carte.
# K a été réglé par les expériences (K = 20 ; avec K = 5 on rate des modifications utiles).
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

# Algorithme des « économies » (Clarke et Wright, 1964) : une bonne solution en moins d'une seconde.
#   - Au départ, chaque client a son propre camion : dépôt -> client -> dépôt.
#   - Livrer i puis j avec le même camion évite un retour au dépôt et un nouveau départ :
#       on économise s(i, j) = D[0][i] + D[0][j] - D[i][j].
#   - On essaie les fusions de la plus grosse économie à la plus petite, et on fusionne deux tournées
#     si le camion reste sous sa capacité Q (et, avec des fenêtres, si la tournée reste à l'heure).
# On ne peut relier i et j que s'ils sont au BOUT de leurs tournées : un client au milieu a déjà
# un voisin de chaque côté.
# C'est un algorithme « glouton » : il prend la meilleure fusion du moment sans revenir en arrière,
# d'où une solution bonne mais pas optimale (≈ 5 % au-dessus du meilleur connu sur les instances X).
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
        # on met i à la fin de A et j au début de B (en retournant si besoin) : parcourir une tournée
        # à l'envers ne change pas sa longueur
        if A[-1] != i:
            A = A[::-1]
        if B[0] != j:
            B = B[::-1]
        fusion = A + B

        if fenetres is not None:
            # avec des fenêtres le sens de parcours compte (il change les heures d'arrivée) :
            # on essaie les deux sens
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


# Utilisée seulement si on impose un nombre maximal de camions (k_max).
# Tant qu'il y a trop de tournées : on vide la moins chargée et on replace chacun de ses clients
# là où il rallonge le moins le trajet (en respectant la capacité et les fenêtres).
# Limite : c'est une méthode simple ; elle peut échouer alors qu'une solution existe
# (savoir si k camions suffisent est déjà un problème difficile : le « bin packing »).
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
                    # insérer c entre « avant » et « apres » : on ajoute deux trajets, on en retire un
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

# Longueur d'une tournée : dépôt -> clients -> dépôt.
# Une tournée est stockée SANS le dépôt (ex. [5, 2, 9]) : on ajoute ici le départ et le retour.
def longueur(tournee, D):
    if len(tournee) == 0:
        return 0
    # dépôt -> premier client, puis client -> client, puis dernier client -> dépôt
    total = D[0][tournee[0]]
    for k in range(len(tournee) - 1):
        total += D[tournee[k]][tournee[k + 1]]
    total += D[tournee[-1]][0]
    return total


# Quantité totale livrée par une tournée (doit rester <= Q).
def charge_de(tournee, demandes):
    total = 0
    for c in tournee:
        total += demandes[c]
    return total


# Vrai si la tournée respecte toutes les fenêtres de temps.
# On suit le camion avec une horloge :
#   - il part du dépôt à l'ouverture ;
#   - il roule jusqu'au client (temps de trajet = distance, convention des instances de Solomon) ;
#   - s'il arrive après la fermeture b_c : interdit, on répond Faux ;
#   - s'il arrive avant l'ouverture a_c : il attend jusqu'à a_c ;
#   - il livre (durée s_c), puis repart vers le client suivant ;
#   - à la fin il doit être rentré avant la fermeture du dépôt.
# Le coût de ce contrôle grandit avec la longueur de la tournée : le recuit le fait donc en dernier.
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


# Même parcours que horaires_ok, mais on note pour chaque client (heure d'arrivée, attente, départ).
# Sert à afficher le planning (notebook, site) : les horaires viennent toujours du solveur.
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


# Coût d'une solution = somme des longueurs de ses tournées (c'est ce qu'on cherche à minimiser).
def cout_total(tournees, D):
    total = 0
    for t in tournees:
        total += longueur(t, D)
    return total


# Vérifie qu'une solution est correcte et renvoie (vrai/faux, message).
# On l'appelle toujours à la fin : on ne fait pas confiance aux calculs faits en cours de route.
# C'est aussi la preuve que le problème est « dans NP » : vérifier une solution proposée est rapide.
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
# Un « mouvement » est une petite modification de la solution autour de deux clients :
#   u (tiré au hasard) et v (un de ses voisins proches) ;
#   tu, tv = numéros de leurs tournées ; pu, pv = leurs positions dans ces tournées.
# Chaque mouvement renvoie seulement les tournées modifiées, sous la forme {numéro : nouvelle tournée},
# sans toucher à la solution (ou None si le mouvement n'a pas de sens). Avantage : si le recuit
# refuse la modification, il n'y a rien à annuler.

# DÉPLACER : on enlève u et on le remet juste avant ou juste après v (au hasard).
# Exemple : A = [a, u, b], B = [c, v, d]  ->  A = [a, b], B = [c, v, u, d]
# C'est le seul mouvement qui fait passer UN client d'un camion à un autre : il rééquilibre les charges.
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


# ÉCHANGER : u et v échangent leurs places (dans la même tournée ou entre deux tournées).
# Exemple : A = [a, u, b], B = [c, v, d]  ->  A = [a, v, b], B = [c, u, d]
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


# 2-OPT : dans une même tournée, on retourne le morceau compris entre u et v.
# Exemple : [a, u, b, c, v, d]  ->  [a, u, v, c, b, d]
# Effet : deux trajets qui se croisent sont « décroisés » (un parcours qui se croise n'est jamais le
# plus court).
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


# 2-OPT* : entre deux tournées, on coupe après u et après v, puis on recolle les morceaux autrement.
#   A = début_A u | fin_A        B = début_B v | fin_B
#   version 1 : on échange les fins  -> début_A u fin_B   et   début_B v fin_A
#   version 2 : on relie u à v       -> début_A u v (début_B à l'envers)
#                                       et (fin_A à l'envers) fin_B
# On tire l'une ou l'autre version à pile ou face. Une des deux tournées peut devenir vide :
# le recuit la supprime (un camion de moins). C'est le mouvement le plus utile sans fenêtres.
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


# NOUVELLE TOURNÉE : u quitte sa tournée et part seul dans un camion supplémentaire.
# (La nouvelle tournée prend le numéro len(tournees) : le recuit l'ajoutera au bout de la liste.)
# Utile avec des fenêtres de temps : un client « gênant » peut bloquer toute une tournée ; sans ce
# mouvement, le recuit n'avait aucun moyen d'ouvrir un camion (il restait jusqu'à 8 % au-dessus de
# l'optimum sur de petites instances).
def nouvelle_tournee(tournees, tu, pu, tv, pv):
    if len(tournees[tu]) == 1:
        return None  # u est déjà seul
    u = tournees[tu][pu]
    return {tu: tournees[tu][:pu] + tournees[tu][pu + 1:], len(tournees): [u]}


# Liste des mouvements et probabilité de tirer chacun (dans le même ordre).
MOUVEMENTS = [deplacer, echanger, deux_opt, deux_opt_etoile, nouvelle_tournee]
NOMS_MOUVEMENTS = ["déplacer", "échanger", "2-opt", "2-opt*", "nouvelle tournée"]
# sans fenêtres de temps : on n'utilise pas "nouvelle tournée" (un client seul dans un
# camion ne peut souvent plus être repris par un autre camion déjà presque plein)
PROBAS_DEFAUT = [0.4, 0.2, 0.2, 0.2, 0.0]
# avec fenêtres de temps : on l'utilise rarement (1 fois sur 200), ça suffit (partie 8.2)
PROBAS_FENETRES = [0.395, 0.2, 0.2, 0.2, 0.005]


# Tire le numéro d'un mouvement au hasard en respectant les probabilités (méthode de la « roulette »).
# Exemple : [0.4, 0.2, 0.2, 0.2, 0] -> 0 dans 40 % des cas, 1 dans 20 % des cas...
# On tire un nombre x entre 0 et la somme des probabilités, puis on regarde dans quelle « case » il tombe.
def tirer_mouvement(probas):
    x = random.random() * sum(probas)
    total = 0
    for m in range(len(probas)):
        total += probas[m]
        if x < total:
            return m
    return len(probas) - 1  # sécurité contre les arrondis des nombres à virgule


# Remet à jour le tableau ou[c] = numéro de la tournée qui contient le client c
# (il permet de retrouver la tournée d'un client immédiatement, sans chercher partout).
def numeroter(tournees, ou):
    for numero in range(len(tournees)):
        for c in tournees[numero]:
            ou[c] = numero


# ---------- 6. le recuit simulé ----------

# Améliore la solution pendant `duree` secondes. À chaque tour de boucle :
#   1) on tire un client u, un de ses voisins proches v et un mouvement ;
#   2) si un camion dépasse sa capacité : refusé ;
#   3) on calcule delta = nouveau coût - ancien coût, SEULEMENT sur les 1 ou 2 tournées modifiées
#      (c'est ce qui permet de faire des millions d'essais) ;
#   4) delta <= 0 (plus court) : accepté ; delta > 0 (plus long) : accepté avec la probabilité
#      exp(-delta / T). C'est le cœur du recuit : accepter parfois une solution moins bonne permet de
#      sortir d'une impasse où aucune petite modification n'améliore plus rien ;
#   5) si on accepte et qu'il y a des fenêtres : on vérifie les horaires (test le plus long, fait en dernier) ;
#   6) on applique la modification et on retient la meilleure solution jamais vue.
# La « température » T baisse au fil du temps, de T_debut à T_fin (baisse géométrique) :
#   au début T est grand -> on accepte souvent des dégradations (on explore) ;
#   à la fin T est presque nul -> on n'accepte plus que les améliorations (on peaufine).
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

    # on retient toujours la meilleure solution vue (le recuit peut finir sur une moins bonne)
    cout = sum(longueurs)
    meilleur_cout = cout
    meilleures_tournees = [t[:] for t in tournees]

    # stats : nb de fois où chaque mouvement est accepté + évolution du coût
    acceptes = [0] * len(MOUVEMENTS)
    historique = []  # (temps, coût, meilleur coût, T) : la courbe de convergence
    iterations = 0
    T = T_debut
    debut = time.time()
    prochain_point = 0.0

    while True:
        # on ne regarde l'heure que toutes les 500 itérations (lire l'horloge coûte plus cher qu'un essai)
        if iterations % 500 == 0:
            ecoule = time.time() - debut
            if ecoule >= duree:
                break
            # baisse géométrique de la température (T = 0 -> simple descente)
            # comme elle dépend du temps écoulé, on atteint T_fin pile à la fin, quelle que soit la machine
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
        #    (delta grand ou T petit -> probabilité proche de 0 ; delta petit ou T grand -> proche de 1)
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

        # nouvelle meilleure solution ? (1e-9 : on ignore les minuscules écarts dus aux arrondis)
        if cout < meilleur_cout - 1e-9:
            meilleur_cout = cout
            meilleures_tournees = [t[:] for t in tournees]

    historique.append((time.time() - debut, cout, meilleur_cout, T))
    return meilleures_tournees, meilleur_cout, iterations, historique, acceptes


# Point d'entrée : fait tout dans l'ordre et renvoie un dictionnaire de résultats.
#   1. distances (ou celles fournies dans inst["D"]) et voisins proches ;
#   2. solution de départ (Clarke et Wright) ;
#   3. températures ;
#   4. recuit ;
#   5. vérification finale et coût recalculé depuis zéro.
# Paramètres : duree (secondes de recuit), graine (même graine = mêmes tirages au hasard),
#   K (nombre de voisins proches), t0 et t1 (températures de début et de fin), probas (mouvements),
#   k_max (nombre maximal de camions, None = libre).
# t0 et t1 sont exprimés en fraction de la longueur moyenne d'un trajet : la température s'adapte
# ainsi à l'échelle de chaque instance. Exemple avec t0 = 2 : au début, une modification qui
# rallonge de deux trajets moyens est acceptée environ une fois sur trois (e^-1 ≈ 37 %).
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
        # écart entre le coût suivi pendant le recuit et le coût recalculé : doit valoir 0
        # (≈ 1e-10 avec des distances à virgule, à cause des arrondis)
        "ecart_suivi": abs(cout - cout_recalcule),
    }


# Petit essai en ligne de commande : python recuit_simple.py [fichier]
if __name__ == "__main__":
    import sys
    chemin = "instances/X-n101-k25.vrp"
    if len(sys.argv) > 1:
        chemin = sys.argv[1]
    if chemin.endswith(".txt"):
        instance = lire_instance_solomon(chemin)
    else:
        instance = lire_instance(chemin)
    resultat = resoudre(instance, duree=10, graine=1, verbose=True)
    print("solution :", resultat["message"])
    print(f"départ (Clarke et Wright) : {resultat['cout_initial']:.0f}")
    print(f"après recuit              : {resultat['cout']:.0f}")
    print(f"{len(resultat['routes'])} tournées, {resultat['iterations']} itérations")
