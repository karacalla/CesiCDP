// Ajoute VITE_MAPBOX_TOKEN=pk.xxx dans .env (ou remplace YOUR_MAPBOX_TOKEN).
export const MAPBOX_TOKEN = import.meta.env?.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN'

/** kg de CO₂ par km, facteur moyen simplifié. */
export const CO2_PER_KM = 0.29

/** Une tournée non optimisée parcourrait ≈ +28 % de km. */
export const NAIVE_ROUTE_OVERHEAD = 0.28

/** kg de CO₂ pour un aller-retour Paris–Lyon en voiture (équivalence affichée). */
export const CO2_PARIS_LYON_ROUND_TRIP = 112
