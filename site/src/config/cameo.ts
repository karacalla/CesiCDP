/**
 * Rôle : réglages du camion du panneau (ADR-022, ADR-025). AUCUNE valeur en dur ailleurs : la machine d'états, le
 *   planificateur de mouvement et le rendu lisent ces constantes ; les tests les remplacent par une horloge simulée.
 * Unités physiques : longueurs en « unités camion » (le camion mesure 420 unités, ≈ 10 m : 1 unité ≈ 2,4 cm),
 *   converties en pixels au moment de jouer (taille réelle de la baie) ; temps en secondes.
 */
export const CAMEO = {
  /** Fondus courts quand les animations sont réduites. */
  fadeMs: 200,
  /** T5 : passage de démonstration après 120 s sans interaction, au plus un par 10 min, absence de 20 s. */
  idleMs: 120_000,
  demoCooldownMs: 600_000,
  demoAbsentMs: 20_000,
  /** Fréquence de vérification de l'inactivité (pas de boucle d'animation continue). */
  idleCheckMs: 5_000,

  /** Trajectoire de sortie (marche avant) : ligne droite, virage à gauche en clothoïde, ligne droite. */
  path: {
    straightIn: 10,
    /**
     * Rayon de l'essieu arrière au braquage maximal : empattement / tan(braquage) = 273 / tan 40° ≈ 325 unités
     * (porteur 19 t : empattement ≈ 6,5 m, rayon de l'essieu arrière ≈ 7,7 m).
     */
    radius: 330,
    /** Longueur de la transition de courbure (clothoïde : le volant tourne progressivement). */
    clothoid: 110,
    /** Cap final (degrés, 0 = vers la droite, négatif = vers le haut de l'écran). */
    headingOut: -72,
    step: 3,
  },
  /**
   * Dynamique (unités / s, unités / s²). Temps accéléré ≈ ×3, comme au cinéma, mais rapports réalistes conservés :
   * marche arrière ≈ 0,4 × la marche avant, accélération latérale bornée (≈ 0,25 g à l'échelle).
   */
  dyn: {
    aMax: 330,
    brake: 300,
    aLat: 360,
    vMax: 620,
    /** Marche arrière : plus lente, freinage jusqu'à l'arrêt dans la baie. */
    vReverse: 240,
    /** Temps de montée de l'accélération (à-coup limité). */
    jerkS: 0.35,
  },
  /** Caméra fixe qui suit le camion du regard : élévation au repos et distance (= perspective CSS du rendu). */
  camera: { elevationDeg: 36, distance: 2800 },
  /** Suspension : roulis et tangage (degrés par unité / s²), bornés. */
  suspension: { rollPerAccel: 0.0065, pitchPerAccel: 0.005, maxRoll: 2.6, maxPitch: 1.6 },
  /** Cadence des images clés (le navigateur interpole entre elles). */
  keyframeFps: 30,
}
