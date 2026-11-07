/**
 * Rôle : clients et dépôt de l'instance courante sur la carte, en couches natives MapLibre (GPU, drapées sur le
 *   relief, regroupement intégré au-delà d'un certain nombre) ; recadrage à chaque changement d'instance.
 * Choix retenu : ADR-004 (couche `circle` native) ; les pins « verre » arrivent en P4 pour l'actif et le survolé.
 */
import { useEffect, useMemo } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'
import type { FeatureCollection, Point } from 'geojson'
import { CAMERA_MS } from '@/config/app'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useVrp } from '@/store/vrp'
import { MAP_ID } from './mapId'

/** Au-delà de ce nombre de clients, les points proches sont regroupés (lisibilité). */
const CLUSTER_FROM = 300

export function CustomersLayer() {
  const instance = useVrp((s) => s.instance)
  const map = useMap()[MAP_ID]
  const reduced = usePrefersReducedMotion()
  const geo = instance?.meta.coordinates === 'geo'

  const data = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: geo ? (instance?.customers ?? []).map((c) => ({ type: 'Feature', id: c.id, properties: { id: c.id, name: c.name }, geometry: { type: 'Point', coordinates: [c.lng, c.lat] } })) : [],
    }),
    [instance, geo],
  )
  const depot = useMemo<FeatureCollection<Point>>(
    () => ({ type: 'FeatureCollection', features: geo && instance ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [instance.depot.lng, instance.depot.lat] } }] : [] }),
    [instance, geo],
  )

  const clustered = data.features.length > CLUSTER_FROM

  // recadrage uniquement quand l'instance change (pas à chaque édition d'une cellule)
  const instanceId = instance?.id
  useEffect(() => {
    if (!map || !geo || !instance || instance.customers.length === 0) return
    let [w, s, e, n] = [instance.depot.lng, instance.depot.lat, instance.depot.lng, instance.depot.lat]
    for (const c of instance.customers) {
      w = Math.min(w, c.lng)
      e = Math.max(e, c.lng)
      s = Math.min(s, c.lat)
      n = Math.max(n, c.lat)
    }
    map.fitBounds([[w, s], [e, n]], { padding: { top: 120, bottom: 60, left: 60, right: 100 }, duration: reduced ? 0 : CAMERA_MS, pitch: 28 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recadrage voulu au seul changement d'instance
  }, [map, instanceId, geo])

  return (
    <>
      {/* MapLibre ne permet pas de changer `cluster` sur une source existante : la clé recrée la source */}
      <Source key={clustered ? 'clustered' : 'plain'} id="cdp-customers" type="geojson" data={data} cluster={clustered} clusterRadius={36} clusterMaxZoom={11}>
        <Layer id="cdp-customer-clusters" type="circle" filter={['has', 'point_count']} paint={{ 'circle-color': '#1e293b', 'circle-radius': ['step', ['get', 'point_count'], 12, 25, 16, 100, 22], 'circle-stroke-color': 'rgba(255,255,255,0.7)', 'circle-stroke-width': 1 }} />
        <Layer id="cdp-customer-cluster-count" type="symbol" filter={['has', 'point_count']} layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Noto Sans Regular'] }} paint={{ 'text-color': '#f1f5f9' }} />
        <Layer id="cdp-customer-points" type="circle" filter={['!', ['has', 'point_count']]} paint={{ 'circle-color': 'rgba(255,255,255,0.9)', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3, 12, 6], 'circle-stroke-color': '#0f172a', 'circle-stroke-width': 1.5 }} />
      </Source>
      <Source id="cdp-depot" type="geojson" data={depot}>
        <Layer id="cdp-depot-point" type="circle" paint={{ 'circle-color': '#f59e0b', 'circle-radius': 8, 'circle-stroke-color': '#020617', 'circle-stroke-width': 2 }} />
      </Source>
    </>
  )
}
