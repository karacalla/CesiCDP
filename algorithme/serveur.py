# Serveur HTTP local qui branche le site (site/, mode « http ») sur le solveur Python
#
#   python serveur.py            puis, dans site/ : npm run dev:solveur
#
# Rôle          : exposer recuit_simple.py au site SANS le modifier : ce fichier ne fait que traduire les
#                 formats (instance du site -> dictionnaire du solveur, résultat du solveur -> clés attendues
#                 par site/src/services/adapters.ts) et lancer resoudre() dans un processus séparé.
# Choix retenu  : bibliothèque standard seulement (http.server + multiprocessing) : rien à installer.
#                 Un calcul = un processus : le serveur reste réactif et « Annuler » arrête vraiment le calcul.
# Alternative   : FastAPI / Flask (plus confortable, mais une dépendance de plus pour 4 routes).
#   écartée
# Question jury : « les données partent-elles sur Internet ? » -> non : serveur sur 127.0.0.1, appelé par le
#                 navigateur de la même machine.
#
# Routes (contrat : site/docs/CONTRAT_SOLVEUR.md, client : site/src/services/httpApi.ts)
#   GET    /instances        liste : NANCY-60 (démo géographique) + instances Solomon + instances X
#   GET    /instances/<id>   une instance au format du site (site/src/types/vrp.ts)
#   POST   /solve            {instance, algo, params} -> {run_id}
#   GET    /runs/<id>        {etat, t, historique, resultat?, message?}  (interrogé toutes les 0,5 s)
#   DELETE /runs/<id>        annulation (le processus de calcul est arrêté)
#
# Conventions de temps et de distance (identiques au notebook) :
#   - instances planes (Solomon, X) : D = distance euclidienne (coupée au dixième pour Solomon, arrondie à
#     l'entier pour X) et temps de trajet = distance ;
#   - instances géographiques (NANCY-60, imports CSV) : distance à vol d'oiseau (haversine) et temps de trajet
#     = distance / vitesse de la flotte, en minutes. Les tracés renvoyés sont des LIGNES DROITES entre arrêts
#     (pas de réseau routier : il faudrait un serveur OSRM local).

import json
import math
import multiprocessing
import os
import sys
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

from recuit_simple import (PROBAS_DEFAUT, calcul_distances, clarke_wright, cout_total, horaires,
                           lire_instance, lire_instance_solomon, resoudre, verifier)

ICI = os.path.dirname(os.path.abspath(__file__))
PORT = 8000
NANCY = os.path.join(ICI, "..", "site", "src", "data", "nancy-60.instance.json")
BKS = json.load(open(os.path.join(ICI, "bks.json"), encoding="utf-8"))
BKS.update(json.load(open(os.path.join(ICI, "bks_solomon.json"), encoding="utf-8")))
JOURNEE = [{"from": 0, "to": 1440, "factor": 1}]  # pas de trafic dans les instances de référence


# ---------- 1. instances de référence -> format du site ----------

# Les instances Solomon / X sont en coordonnées planes (x, y) sans lieu réel. Pour garder l'effet de carte, on les
# PROJETTE sur une zone d'environ 60 km entre Nancy et les Vosges, POUR L'AFFICHAGE SEULEMENT : au moment du calcul,
# le serveur relit le fichier d'origine (distances, fenêtres) : coûts et gaps restent ceux de l'instance.
CENTRE_LAT, CENTRE_LNG, COTE_KM = 48.45, 6.40, 60.0


def projeter(coords):
    xs = [x for x, _ in coords]
    ys = [y for _, y in coords]
    xc, yc = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    km_par_unite = COTE_KM / max(max(xs) - min(xs), max(ys) - min(ys), 1e-9)
    k_lat = km_par_unite / 111.32
    k_lng = km_par_unite / (111.32 * math.cos(math.radians(CENTRE_LAT)))
    return [(CENTRE_LAT + (y - yc) * k_lat, CENTRE_LNG + (x - xc) * k_lng) for x, y in coords]


NOTE_PROJECTION = ("Positions PROJETÉES autour de Nancy pour l'affichage (instance de référence sans lieu réel) ; "
                   "distances, coûts et gap : ceux du fichier d'origine.")

def nb_camions_solomon(chemin):
    # la ligne qui suit « NUMBER CAPACITY » donne le nombre de camions (lire_instance_solomon ne le garde pas)
    lignes = [l.split() for l in open(chemin, encoding="utf-8") if l.strip()]
    for k, m in enumerate(lignes):
        if m[0] == "NUMBER":
            return int(lignes[k + 1][0])
    return None


def instance_solomon(nom):
    chemin = os.path.join(ICI, "solomon", nom + ".txt")
    inst = lire_instance_solomon(chemin)
    pos = projeter(inst["coords"])
    (y0, x0), (a0, b0) = pos[0], inst["fenetres"][0]
    n = len(inst["demandes"]) - 1
    clients = []
    for i in range(1, n + 1):
        lat, lng = pos[i]
        a, b = inst["fenetres"][i]
        clients.append({"id": i, "name": f"Client {i}", "lat": lat, "lng": lng, "demand": inst["demandes"][i],
                        "tw": {"a": a, "b": b}, "service": inst["services"][i]})
    meta = {"source": "solomon", "coordinates": "geo", "projected": True, "note": NOTE_PROJECTION,
            "bksObjective": "Distance totale (distances coupées au dixième), optimum publié sur CVRPLIB"}
    if nom in BKS:
        meta["bks"] = BKS[nom]
    return {"id": nom, "name": f"{nom.upper()} (Solomon, {n} clients)",
            "depot": {"name": "Dépôt (client 0)", "lat": y0, "lng": x0, "tw": {"a": a0, "b": b0}},
            "customers": clients, "fleet": {"k": nb_camions_solomon(chemin) or n, "Q": inst["Q"], "fixedCost": 0,
                                             "baseSpeedKmh": 50},
            "traffic": {"slots": JOURNEE}, "options": {"timeWindows": "strict", "allowWait": True}, "meta": meta}


def instance_x(nom):
    inst = lire_instance(os.path.join(ICI, "instances", nom + ".vrp"))
    pos = projeter(inst["coords"])
    y0, x0 = pos[0]
    n = len(inst["demandes"]) - 1
    clients = [{"id": i, "name": f"Client {i}", "lat": pos[i][0], "lng": pos[i][1],
                "demand": inst["demandes"][i], "tw": None, "service": 0} for i in range(1, n + 1)]
    meta = {"source": "vrplib", "coordinates": "geo", "projected": True, "note": NOTE_PROJECTION,
            "bksObjective": "Somme des distances euclidiennes arrondies (EUC_2D), meilleure solution connue"}
    if nom in BKS:
        meta["bks"] = BKS[nom]
    return {"id": nom, "name": f"{nom} (Uchoa, {n} clients)",
            "depot": {"name": "Dépôt", "lat": y0, "lng": x0, "tw": {"a": 0, "b": 1440}},
            "customers": clients, "fleet": {"k": int(nom.split("-k")[1]), "Q": inst["Q"], "fixedCost": 0,
                                             "baseSpeedKmh": 50},
            "traffic": {"slots": JOURNEE}, "options": {"timeWindows": "off", "allowWait": True}, "meta": meta}


def liste_instances():
    out = [{"id": "NANCY-60", "name": "NANCY-60 — Nancy et vallées vosgiennes (démo, clients fictifs)",
            "customers": 60, "hasGeometry": True}]
    for f in sorted(os.listdir(os.path.join(ICI, "solomon"))):
        if f.endswith(".txt"):
            out.append({"id": f[:-4], "name": f"{f[:-4].upper()} (Solomon, fenêtres de temps)",
                        "customers": 100, "hasGeometry": True})
    for f in sorted(os.listdir(os.path.join(ICI, "instances")), key=lambda s: int(s.split("-")[1][1:])):
        if f.endswith(".vrp"):
            n = int(f.split("-")[1][1:]) - 1
            out.append({"id": f[:-4], "name": f"{f[:-4]} (Uchoa, sans fenêtres)", "customers": n, "hasGeometry": True})
    return out


def charger_instance(ident):
    if ident == "NANCY-60":
        return json.load(open(NANCY, encoding="utf-8"))
    if os.path.exists(os.path.join(ICI, "solomon", ident + ".txt")):
        return instance_solomon(ident)
    if os.path.exists(os.path.join(ICI, "instances", ident + ".vrp")):
        return instance_x(ident)
    return None


# ---------- 2. instance du site -> dictionnaire du solveur ----------

def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))


def reference_fichier(site):
    """Instance projetée : relit le fichier d'origine et vérifie que le site ne l'a pas modifiée."""
    ident = site["id"]
    solomon = os.path.join(ICI, "solomon", ident + ".txt")
    ref = lire_instance_solomon(solomon) if os.path.exists(solomon) else lire_instance(
        os.path.join(ICI, "instances", ident + ".vrp"))
    clients = site["customers"]
    modifiee = (len(clients) != len(ref["demandes"]) - 1
                or any(c["id"] != i + 1 or c["demand"] != ref["demandes"][i + 1] for i, c in enumerate(clients))
                or site["fleet"]["Q"] != ref["Q"])
    if "fenetres" in ref and not modifiee:
        modifiee = any(c["tw"] is None or (c["tw"]["a"], c["tw"]["b"]) != tuple(ref["fenetres"][i + 1])
                       or c["service"] != ref["services"][i + 1] for i, c in enumerate(clients))
    if modifiee:
        raise ValueError(f"{ident} a été modifiée dans le site : rechargez-la (le serveur calcule les distances "
                         "depuis le fichier d'origine, les positions affichées sont projetées).")
    inst = {"nom": ident, "demandes": ref["demandes"], "Q": ref["Q"],
            "D": calcul_distances(ref["coords"], ref["arrondi"])}
    if site["options"]["timeWindows"] == "strict" and "fenetres" in ref:
        inst["fenetres"], inst["services"] = ref["fenetres"], ref["services"]
    return inst


def vers_solveur(site):
    """Renvoie (inst pour resoudre, D_km ou None, liste des identifiants du site dans l'ordre 1..n).
    D_km n'est fourni que pour une instance géographique RÉELLE (distances en km)."""
    depot, clients = site["depot"], site["customers"]
    ids = [c["id"] for c in clients]
    lieux = [depot] + clients
    # instance de référence affichée en positions projetées : on calcule sur le fichier d'origine
    if site["meta"].get("projected") or (site["meta"]["source"] in ("solomon", "vrplib")
                                         and site["meta"]["coordinates"] == "geo"):
        return reference_fichier(site), None, ids
    inst = {"nom": site["id"], "demandes": [0] + [c["demand"] for c in clients], "Q": site["fleet"]["Q"]}
    D_km = None
    if site["meta"]["coordinates"] == "geo":
        # temps de trajet en minutes à la vitesse de la flotte (le solveur lit le temps dans D)
        D_km = [[haversine_km(a["lat"], a["lng"], b["lat"], b["lng"]) for b in lieux] for a in lieux]
        v = site["fleet"]["baseSpeedKmh"]
        inst["D"] = [[d / v * 60 for d in ligne] for ligne in D_km]
    else:
        source = site["meta"]["source"]
        arrondi = "dixieme" if source == "solomon" else (source == "vrplib")
        inst["D"] = calcul_distances([(p["lng"], p["lat"]) for p in lieux], arrondi)
    if site["options"]["timeWindows"] == "strict":
        grand = 10 ** 9
        inst["fenetres"] = [(depot["tw"]["a"], depot["tw"]["b"])] + [
            (c["tw"]["a"], c["tw"]["b"]) if c["tw"] else (0, grand) for c in clients]
        inst["services"] = [0] + [c["service"] for c in clients]
    return inst, D_km, ids


def trafic_actif(site):
    return any(s["factor"] != 1 for s in site["traffic"]["slots"])


# ---------- 3. résultat du solveur -> clés attendues par le site (adapters.ts) ----------

def vers_site(site, inst, D_km, ids, routes, res):
    geo = D_km is not None                               # distances réelles en km
    carte = site["meta"]["coordinates"] == "geo"         # positions affichables (réelles ou projetées)
    D = inst["D"]
    fen, serv = inst.get("fenetres"), inst.get("services")
    lieux = [site["depot"]] + site["customers"]
    tournees = []
    for numero, t in enumerate(routes, start=1):
        chemin = [0] + t + [0]
        if geo:
            dist = sum(D_km[chemin[k]][chemin[k + 1]] for k in range(len(chemin) - 1)) * 1000
        else:
            dist = sum(D[a][b] for a, b in zip(chemin, chemin[1:]))  # unité de l'instance
        # tracé en lignes droites entre arrêts (pas de réseau routier), sur les positions affichées
        geometrie = [[lieux[c]["lng"], lieux[c]["lat"]] for c in chemin] if carte else None
        tour = {"camion": numero, "charge": sum(inst["demandes"][c] for c in t), "distance_m": dist,
                "geometrie": geometrie, "debut": None, "fin": None,
                "arrets": [{"client": ids[c - 1], "arrivee": None, "attente": None, "depart": None, "retard": None}
                           for c in t]}
        if fen is not None:
            # horaires calculés par le solveur (horaires()), jamais par le site
            h = horaires(t, D, fen, serv)
            tour["debut"] = fen[0][0]
            tour["fin"] = (h[-1][2] + D[t[-1]][0]) if t else fen[0][0]
            tour["arrets"] = [{"client": ids[c - 1], "arrivee": arr, "attente": att, "depart": dep,
                               "retard": max(0.0, arr + att - fen[c][1])}
                              for c, (arr, att, dep) in zip(t, h)]
            # trajets : départ, durée, distance (temps de route et vitesse affichés par le site)
            departs = [fen[0][0]] + [dep for (_, _, dep) in h]
            chemin = [0] + t + [0]
            tour["trajets"] = [{"de": 0 if a == 0 else ids[a - 1], "vers": 0 if b == 0 else ids[b - 1],
                                "depart": departs[k], "duree_min": D[a][b],
                                "distance_m": (D_km[a][b] * 1000) if geo else D[a][b], "coef": 1}
                               for k, (a, b) in enumerate(zip(chemin, chemin[1:]))]
        tournees.append(tour)
    if geo:
        objectif = "Temps de trajet total (min), distances à vol d'oiseau / vitesse de la flotte"
    elif site["meta"]["source"] == "solomon":
        objectif = "Distance totale (distances coupées au dixième), comme l'optimum CVRPLIB"
    else:
        objectif = "Somme des distances euclidiennes arrondies (EUC_2D)"
    sortie = {
        "cout": res["cout"], "cout_initial": res["cout_initial"], "valide": res["valide"],
        "message": res["message"] + " (solveur Python, recuit_simple.py)", "iterations": res["iterations"],
        "objectif": objectif, "tournees": tournees,
        "historique": [list(p) for p in res["historique"]],
        "contraintes_ignorees": ["trafic"] if trafic_actif(site) else [],
    }
    bks = site["meta"].get("bks")
    if bks:
        sortie["bks"] = bks
    return sortie


# ---------- 4. un calcul = un processus ----------

def calculer(requete, file):
    """Exécuté dans un processus séparé : résout puis dépose le résultat (ou l'erreur) dans la file."""
    try:
        site, algo, p = requete["instance"], requete["algo"], requete["params"]
        inst, D_km, ids = vers_solveur(site)
        if algo == "milp":
            raise ValueError("Le PLNE n'est pas branché sur le site (trop lent au-delà de quelques dizaines de "
                             "clients : voir exact_bench.py et la partie 3 du notebook).")
        if algo == "clarke-wright":
            debut = time.time()
            routes = clarke_wright(inst["D"], inst["demandes"], inst["Q"], inst.get("fenetres"), inst.get("services"))
            ok, msg = verifier(routes, inst["demandes"], inst["Q"], None, inst["D"], inst.get("fenetres"),
                               inst.get("services"))
            cout = cout_total(routes, inst["D"])
            res = {"cout": cout, "cout_initial": cout, "valide": ok, "message": msg, "iterations": 0,
                   "historique": [(time.time() - debut, cout, cout, 0.0)]}
        else:
            probas = list(p["moveProbas"])
            if "fenetres" not in inst and len(probas) == len(PROBAS_DEFAUT):
                probas[-1] = 0  # « nouvelle tournée » seulement avec fenêtres (choix du notebook, partie 8.2)
            res = resoudre(inst, duree=p["durationS"], graine=p["seed"], K=p["K"], t0=p["t0"], t1=p["t1"],
                           probas=probas, k_max=p.get("kMax"))
            routes = res["routes"]
        file.put(("termine", vers_site(site, inst, D_km, ids, routes, res)))
    except Exception as e:  # le message part vers le site, qui l'affiche
        file.put(("erreur", f"{type(e).__name__} : {e}"))


CALCULS = {}  # run_id -> {"processus", "file", "debut", "etat", "resultat", "message"}


def etat_calcul(run_id):
    c = CALCULS[run_id]
    if c["etat"] == "en_cours" and not c["file"].empty():
        c["etat"], valeur = c["file"].get()
        c["resultat" if c["etat"] == "termine" else "message"] = valeur
        c["processus"].join()
    elif c["etat"] == "en_cours" and not c["processus"].is_alive() and c["file"].empty():
        c["etat"], c["message"] = "erreur", "le processus de calcul s'est arrêté sans résultat"
    reponse = {"etat": c["etat"], "t": round(time.time() - c["debut"], 2)}
    if c["etat"] == "termine":
        reponse["resultat"] = c["resultat"]
        reponse["historique"] = c["resultat"]["historique"]
    if c["etat"] == "erreur":
        reponse["message"] = c["message"]
    return reponse


# ---------- 5. serveur HTTP ----------

class Gestionnaire(BaseHTTPRequestHandler):
    def envoyer(self, code, donnees=None):
        corps = b"" if donnees is None else json.dumps(donnees, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        # le site (localhost:5173) appelle ce serveur (localhost:8000) : autorisation CORS
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if donnees is not None:
            self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_OPTIONS(self):
        self.envoyer(204)

    def do_GET(self):
        morceaux = [unquote(m) for m in self.path.strip("/").split("/")]
        if morceaux == ["instances"]:
            return self.envoyer(200, liste_instances())
        if len(morceaux) == 2 and morceaux[0] == "instances":
            inst = charger_instance(morceaux[1])
            return self.envoyer(200, inst) if inst else self.envoyer(404, {"message": "instance inconnue"})
        if len(morceaux) == 2 and morceaux[0] == "runs" and morceaux[1] in CALCULS:
            return self.envoyer(200, etat_calcul(morceaux[1]))
        self.envoyer(404, {"message": "route inconnue"})

    def do_POST(self):
        if self.path.rstrip("/") != "/solve":
            return self.envoyer(404, {"message": "route inconnue"})
        requete = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
        run_id = uuid.uuid4().hex[:12]
        file = multiprocessing.Queue()
        processus = multiprocessing.Process(target=calculer, args=(requete, file), daemon=True)
        processus.start()
        CALCULS[run_id] = {"processus": processus, "file": file, "debut": time.time(), "etat": "en_cours"}
        print(f"calcul {run_id} : {requete['instance']['id']}, {requete['algo']}, "
              f"{requete['params']['durationS']} s", flush=True)
        self.envoyer(200, {"run_id": run_id})

    def do_DELETE(self):
        morceaux = self.path.strip("/").split("/")
        if len(morceaux) == 2 and morceaux[0] == "runs" and morceaux[1] in CALCULS:
            c = CALCULS.pop(morceaux[1])
            if c["processus"].is_alive():
                c["processus"].terminate()  # « Annuler » arrête vraiment le calcul
            return self.envoyer(204)
        self.envoyer(404, {"message": "calcul inconnu"})

    def log_message(self, *args):
        pass  # pas une ligne par interrogation (toutes les 0,5 s)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        PORT = int(sys.argv[1])
    serveur = ThreadingHTTPServer(("127.0.0.1", PORT), Gestionnaire)
    print(f"solveur prêt sur http://127.0.0.1:{PORT}  (site : cd ../site && npm run dev:solveur)", flush=True)
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        print("arrêt")
