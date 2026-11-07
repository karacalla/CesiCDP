/**
 * Rôle : clients et dépôt de l'instance courante sur la carte, en couches natives MapLibre (GPU, drapées sur le
 *   relief, regroupement intégré au-delà d'un certain nombre).
 * Choix retenu : ADR-004 (couche `circle` native) ; les pins « verre » arrivent en P4 pour l'actif et le survolé.
 */
import { useEffect, useMemo } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'
import type { FeatureCollection, Point } from 'geojson'
import { CAMERA_MS, DRONE_PITCH } from '@/config/app'
import { useRun } from '@/store/run'
import { useSelection } from '@/store/selection'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { useScene } from '@/store/scene'
import { useVrp } from '@/store/vrp'
import { labelLayerId, MAP_ID } from './mapId'
import { visiblePadding } from '@/lib/cameraPadding'

/** Au-delà de ce nombre de clients, les points proches sont regroupés (lisibilité). */
const CLUSTER_FROM = 300

export function CustomersLayer() {
  const instance = useVrp((s) => s.instance)
  const map = useMap()[MAP_ID]
  const reduced = useMotionLevel() !== 'full'
  const geo = instance?.meta.coordinates === 'geo'
  const result = useRun((s) => s.result)
  const vehicleId = useSelection((s) => s.vehicleId)
  const selectStop = useSelection((s) => s.selectStop)
  // les arrêts du camion sélectionné sont dessinés en pins « verre » (MapMarkers) : pas de doublon ici
  const pinned = useMemo(() => new Set(result?.routes.find((r) => r.vehicleId === vehicleId)?.stops.map((s) => s.customerId) ?? []), [result, vehicleId])
  const owner = useMemo(() => new Map(result?.routes.flatMap((r) => r.stops.map((s) => [s.customerId, r.vehicleId] as const)) ?? []), [result])

  const data = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: geo ? (instance?.customers ?? []).filter((c) => !pinned.has(c.id)).map((c) => ({ type: 'Feature', id: c.id, properties: { id: c.id, name: c.name }, geometry: { type: 'Point', coordinates: [c.lng, c.lat] } })) : [],
    }),
    [instance, geo, pinned],
  )
  const depot = useMemo<FeatureCollection<Point>>(
    () => ({ type: 'FeatureCollection', features: geo && instance && pinned.size === 0 ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [instance.depot.lng, instance.depot.lat] } }] : [] }),
    [instance, geo, pinned],
  )

  // clic sur un client : on le sélectionne, avec son camion s'il est planifié
  useEffect(() => {
    if (!map) return
    const onClick = (e: { features?: Array<{ properties: Record<string, unknown> }> }): void => {
      const id = Number(e.features?.[0]?.properties.id)
      if (Number.isFinite(id)) selectStop(id, owner.get(id) ?? null)
    }
    map.on('click', 'cdp-customer-points', onClick)
    return () => void map.off('click', 'cdp-customer-points', onClick)
  }, [map, owner, selectStop])
  const before = labelLayerId(map)

  const clustered = data.features.length > CLUSTER_FROM

  // recadrage quand l'instance change (pas à chaque édition d'une cellule), seulement dans la vue des tournées :
  // sans tournée, la scène est le globe (GlobeDirector pilote la caméra)
  const instanceId = instance?.id
  useEffect(() => {
    if (!map || !geo || !instance || instance.customers.length === 0 || useScene.getState().phase !== 'routes' || !useRun.getState().result) return
    let [w, s, e, n] = [instance.depot.lng, instance.depot.lat, instance.depot.lng, instance.depot.lat]
    for (const c of instance.customers) {
      w = Math.min(w, c.lng)
      e = Math.max(e, c.lng)
      s = Math.min(s, c.lat)
      n = Math.max(n, c.lat)
    }
    map.fitBounds([[w, s], [e, n]], { padding: visiblePadding(map.getContainer(), { top: 120, bottom: 60, left: 60, right: 60 }), duration: reduced ? 0 : CAMERA_MS, pitch: DRONE_PITCH })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recadrage voulu au seul changement d'instance
  }, [map, instanceId, geo])

  return (
    <>
      {/* MapLibre ne permet pas de changer `cluster` sur une source existante : la clé recrée la source */}
      <Source key={clustered ? 'clustered' : 'plain'} id="cdp-customers" type="geojson" data={data} cluster={clustered} clusterRadius={36} clusterMaxZoom={11}>
        <Layer id="cdp-customer-clusters" type="circle" beforeId={before} filter={['has', 'point_count']} paint={{ 'circle-color': '#1e293b', 'circle-radius': ['step', ['get', 'point_count'], 12, 25, 16, 100, 22], 'circle-stroke-color': 'rgba(255,255,255,0.7)', 'circle-stroke-width': 1 }} />
        <Layer id="cdp-customer-cluster-count" type="symbol" filter={['has', 'point_count']} layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Noto Sans Regular'] }} paint={{ 'text-color': '#f1f5f9' }} />
        <Layer id="cdp-customer-points" type="circle" beforeId={before} filter={['!', ['has', 'point_count']]} paint={{ 'circle-color': result ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.9)', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3, 12, 6], 'circle-stroke-color': '#0f172a', 'circle-stroke-width': 1.5 }} />
      </Source>
      <Source id="cdp-depot" type="geojson" data={depot}>
        {/* le dépôt n'est pas ambre : l'ambre est réservé à l'actif et au parcouru */}
        <Layer id="cdp-depot-point" type="circle" beforeId={before} paint={{ 'circle-color': '#0f172a', 'circle-radius': 8, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 }} />
      </Source>
    </>
  )
}
