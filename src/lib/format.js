/** Nombre au format français (virgule décimale). `digits` fixe les décimales. */
export const formatNumber = (n, digits) =>
  (digits === undefined ? String(n) : n.toFixed(digits)).replace('.', ',')
