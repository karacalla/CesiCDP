import type { Map as MlMap } from 'maplibre-gl'

/** Identifiant de la carte principale (react-map-gl : `useMap()[MAP_ID]`). */
export const MAP_ID = 'main'

/** Les tracés passent sous les libellés de lieux (lisibilité). */
export function labelLayerId(map: { getMap(): MlMap } | undefined): string | undefined {
  return map?.getMap().getStyle()?.layers.find((l) => l.type === 'symbol' && l.id.startsWith('place_'))?.id
}
