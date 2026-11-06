// ex : formatNumber(22315.4, 1) donne "22 315,4"
export function formatNumber(n, decimales = 0) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}
