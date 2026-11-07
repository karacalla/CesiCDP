/**
 * Rôle : réseau de dépôts simulé sur le globe : arcs fins ambre, points (dépôt de NANCY-60 en ambre, autres en
 *   blanc), anneaux pulsants. Couches natives MapLibre ; l'opacité passe à 0 en 800 ms dès que le vol commence.
 * L'animation des anneaux est faite par la boucle unique de GlobeDirector (pas de second requestAnimationFrame).
 */
import { Layer, Source } from 'react-map-gl/maplibre'
import { GLOBE } from '@/config/globe'
import { useScene } from '@/store/scene'
import { ARCS, DEPOTS } from './globeData'

const FADE = { duration: 800, delay: 0 }
/** Anneaux animés par la boucle : sans transition (sinon MapLibre interpole 300 ms et redessine à 60 images/s). */
const INSTANT = { duration: 0, delay: 0 }

export function GlobeLayer() {
  const phase = useScene((s) => s.phase)
  const on = phase === 'globe'
  const visibility = phase === 'routes' ? 'none' : 'visible'
  return (
    <>
      <Source id="cdp-globe-arcs" type="geojson" data={ARCS}>
        <Layer id="cdp-globe-arcs" type="line" layout={{ visibility, 'line-cap': 'round' }} paint={{ 'line-color': '#f59e0b', 'line-width': 1.2, 'line-opacity': on ? 0.5 : 0, 'line-opacity-transition': FADE }} />
      </Source>
      <Source id="cdp-globe-depots" type="geojson" data={DEPOTS}>
        <Layer
          id="cdp-globe-rings"
          type="circle"
          layout={{ visibility }}
          paint={{ 'circle-radius': GLOBE.ringFrom, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#f59e0b', 'circle-stroke-width': 1.5, 'circle-stroke-opacity': on ? 0.8 : 0, 'circle-radius-transition': INSTANT, 'circle-stroke-opacity-transition': INSTANT }}
        />
        <Layer
          id="cdp-globe-depots"
          type="circle"
          layout={{ visibility }}
          paint={{
            'circle-radius': ['case', ['get', 'hub'], 5.5, 3.5],
            'circle-color': ['case', ['get', 'hub'], '#f59e0b', '#f1f5f9'],
            'circle-stroke-color': '#0a1120',
            'circle-stroke-width': 1,
            'circle-opacity': on ? 1 : 0,
            'circle-opacity-transition': FADE,
            'circle-stroke-opacity': on ? 1 : 0,
          }}
        />
      </Source>
    </>
  )
}
