// npm i react-map-gl@7 mapbox-gl framer-motion lucide-react
// Tailwind CSS doit être actif. Ajoute VITE_MAPBOX_TOKEN=pk.xxx dans .env (ou remplace YOUR_MAPBOX_TOKEN).
import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Marker, Source, Layer } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck, Home, BarChart3, Route as RouteIcon, Star, SlidersHorizontal, Share2, Package,
  Search, Bell, MoreHorizontal, Plus, Minus, LocateFixed, RotateCw, Leaf, X,
} from 'lucide-react'

const MAPBOX_TOKEN = import.meta.env?.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN'
const CO2_PER_KM = 0.29 // kg CO₂/km, facteur moyen simplifié
const PAL = { pink: '#f471b5', indigo: '#818cf8', blue: '#3abdf8' }

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;600;800;900&display=swap');
:root{--color-bg:#0f172a;--color-bg-dark:#0c1425;--color-bg-darker:#0a1120;--color-muted-bg:#1e293b;--color-muted-text:#6d7580;--color-accent-pink:#f471b5;--color-accent-indigo:#818cf8;--color-accent-blue:#3abdf8}
.cdp *{font-family:Inter,system-ui,sans-serif}
.no-scrollbar{scrollbar-width:none}.no-scrollbar::-webkit-scrollbar{display:none}
.glass{background:rgba(15,23,42,.55);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.14)}
.glass-light{background:rgba(255,255,255,.92);backdrop-filter:blur(18px);box-shadow:0 24px 50px -18px rgba(2,6,23,.6)}
@keyframes ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.3);opacity:0}}
.pulse-ring::after{content:'';position:absolute;inset:0;border-radius:9999px;border:1.5px solid var(--c);animation:ring 2.2s ease-out infinite}
@keyframes sheen{0%{background-position:0 0}100%{background-position:200% 0}}
.sheen{background-size:200% 100%;animation:sheen 4s linear infinite}
.mapboxgl-ctrl-bottom-left,.mapboxgl-ctrl-bottom-right{opacity:.3}
@media (max-width:640px){.cdp{padding:.5rem}.cdp .app-shell{min-height:auto;border-radius:22px;max-height:none}.cdp .map-panel{height:440px;min-height:440px}.cdp .map-header{left:.75rem;right:.75rem;top:.75rem;gap:.5rem;align-items:flex-start}.cdp .map-brand{font-size:1.5rem}.cdp .map-nav{display:none}.cdp .map-meta{left:.75rem;top:4.8rem}.cdp .map-meta h2{font-size:1.45rem}.cdp .floating-hud{left:.75rem;right:.75rem;width:auto;bottom:4.5rem}.cdp .map-location-pill{left:.75rem;bottom:1rem;right:auto;max-width:calc(100% - 5.5rem)}.cdp .map-zoom{bottom:1rem;right:1rem}.cdp .dashboard-panel{height:auto;min-height:0;padding:1rem}.cdp .dashboard-header{flex-direction:column;align-items:stretch}.cdp .dashboard-controls{width:100%}.cdp .stats-grid{grid-template-columns:1fr}} @media (min-width:641px) and (max-width:1023px){.cdp .stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))}} @media (prefers-reduced-motion:reduce){.pulse-ring::after,.sheen{animation:none}}
`

// ---------- Données : vallée de Chamonix, coordonnées [lng, lat, altitude m] ----------
const ROUTES = [
  { id: 'A', name: 'Camion 1 · Vallée nord', color: PAL.blue, date: '28 oct', start: '08:10', end: '09:42', km: 27.4, load: 92, from: 'Les Houches', to: 'Le Tour',
    coords: [[6.7979,45.8908,1010],[6.8453,45.8987,1060],[6.8694,45.9237,1035],[6.8886,45.9503,1060],[6.9253,45.9806,1252],[6.9667,46.0056,1462]] },
  { id: 'B', name: 'Camion 2 · Col des Montets', color: PAL.pink, date: '28 oct', start: '08:30', end: '09:25', km: 14.1, load: 78, from: 'Argentière', to: 'Vallorcine',
    coords: [[6.9253,45.9806,1252],[6.9,46.0,1380],[6.9231,46.0211,1461],[6.9439,46.0344,1260]] },
  { id: 'C', name: 'Camion 3 · Pays du Mont-Blanc', color: PAL.indigo, date: '27 oct', start: '14:05', end: '14:51', km: 12.6, load: 85, from: 'Saint-Gervais', to: 'Servoz',
    coords: [[6.7114,45.8933,820],[6.733,45.91,900],[6.7667,45.9242,816]] },
]
const STOPS = [
  { id: 's1', name: 'Chamonix centre', route: 'A', coord: [6.8694,45.9237], parcels: 24, status: 'À l’heure', eta: '08:52', win: '08:30–09:00', dist: '300 m', min: 3, t: 0.4 },
  { id: 's2', name: 'Argentière', route: 'A', coord: [6.9253,45.9806], parcels: 11, status: 'En avance', eta: '09:14', win: '09:10–09:40', dist: '6,8 km', min: 14, t: 0.8 },
  { id: 's3', name: 'Le Tour', route: 'A', coord: [6.9667,46.0056], parcels: 6, status: 'À l’heure', eta: '09:42', win: '09:30–10:00', dist: '10,1 km', min: 21, t: 1 },
  { id: 's4', name: 'Vallorcine', route: 'B', coord: [6.9439,46.0344], parcels: 4, status: 'Retard 6 min', eta: '09:25', win: '09:00–09:20', dist: '14,1 km', min: 38, t: 1 },
  { id: 's5', name: 'Saint-Gervais', route: 'C', coord: [6.7114,45.8933], parcels: 9, status: 'À l’heure', eta: '14:05', win: '14:00–14:20', dist: '0 m', min: 0, t: 0 },
  { id: 's6', name: 'Servoz', route: 'C', coord: [6.7667,45.9242], parcels: 5, status: 'En avance', eta: '14:51', win: '14:45–15:15', dist: '12,6 km', min: 46, t: 1 },
]
const STATUS_COLOR = (s) => (s.startsWith('Retard') ? PAL.pink : s === 'En avance' ? PAL.blue : PAL.indigo)

const geo = (r) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r.coords } })
const profile = (coords, w = 96, h = 28) => {
  const a = coords.map((c) => c[2]); const mn = Math.min(...a); const mx = Math.max(...a)
  const pts = coords.map((c, i) => [(i / (coords.length - 1)) * w, h - 3 - ((c[2] - mn) / (mx - mn || 1)) * (h - 6)])
  return { d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '), pts }
}
const pointAt = (pts, t) => { const f = t * (pts.length - 1); const i = Math.min(Math.floor(f), pts.length - 2); const k = f - i
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k] }

// ---------- Composants ----------
function Pin({ s, color, active, onClick }) {
  return (
    <button onClick={onClick} aria-label={`${s.name}, ${s.parcels} colis`} style={{ '--c': color }}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 ${active ? 'scale-110 border-white bg-white text-slate-900' : 'border-white/40 bg-[#0f172a]/55 text-white hover:scale-110'}`}>
      {active && <span className="pulse-ring absolute inset-0 rounded-full" />}
      <Package size={16} />
      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black text-slate-950" style={{ background: color }}>{s.parcels}</span>
    </button>
  )
}

function Elevation({ route, t, color }) {
  const { d, pts } = useMemo(() => profile(route.coords), [route])
  const [x, y] = pointAt(pts, t)
  return (
    <svg viewBox="0 0 96 28" className="h-8 w-24 overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x} cy={y} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}

function TruckTopDown() {
  return (
    <svg viewBox="0 0 360 190" className="w-full max-w-[400px] drop-shadow-2xl" aria-label="Camion de livraison vu de dessus">
      <defs>
        <filter id="blur"><feGaussianBlur stdDeviation="9" /></filter>
        <linearGradient id="cab" x1="0" x2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor={PAL.blue} /></linearGradient>
      </defs>
      <ellipse cx="180" cy="166" rx="150" ry="12" fill="#0f172a" opacity=".28" filter="url(#blur)" />
      {[48, 92, 140].map((x) => (<g key={x}><rect x={x} y="44" width="30" height="9" rx="4" fill="#0a1120" /><rect x={x} y="137" width="30" height="9" rx="4" fill="#0a1120" /></g>))}
      <rect x="226" y="48" width="26" height="9" rx="4" fill="#0a1120" /><rect x="226" y="133" width="26" height="9" rx="4" fill="#0a1120" />
      <rect x="16" y="52" width="214" height="86" rx="12" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="16" y="88" width="214" height="14" fill={PAL.pink} opacity=".9" />
      {[50, 90, 130, 170, 210].map((x) => (<line key={x} x1={x} y1="56" x2={x} y2="134" stroke="#e2e8f0" strokeWidth="1.5" />))}
      <rect x="234" y="58" width="96" height="74" rx="22" fill="url(#cab)" />
      <rect x="292" y="66" width="26" height="58" rx="9" fill="#0f172a" opacity=".85" />
      <rect x="240" y="64" width="40" height="62" rx="12" fill="#fff" opacity=".18" />
      <rect x="296" y="50" width="16" height="7" rx="3" fill="#0f172a" /><rect x="296" y="133" width="16" height="7" rx="3" fill="#0f172a" />
    </svg>
  )
}

function Journey({ r, active, onClick }) {
  return (
    <motion.button layout whileHover={{ y: -2 }} onClick={onClick}
      className={`relative w-full overflow-hidden rounded-2xl bg-[var(--color-bg)] p-4 text-left text-white transition-shadow ${active ? 'ring-2 ring-offset-2 ring-offset-[#f1f3f5]' : ''}`} style={{ '--tw-ring-color': r.color }}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-light text-slate-300">{r.date}</span>
        <span className="text-[11px] text-[var(--color-muted-text)]">{r.start}</span>
        <span className="text-sm font-extrabold">{Math.round((r.km / 27.4) * 92) || 0} min</span>
        <span className="text-[11px] text-[var(--color-muted-text)]">{r.end}</span>
      </div>
      <div className="relative my-3 flex items-center justify-between">
        <span className="absolute left-1 right-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full" style={{ background: `linear-gradient(90deg, ${r.color}, ${r.color}99)` }} />
        <span className="relative h-2.5 w-2.5 rounded-full ring-4 ring-[var(--color-bg)]" style={{ background: r.color }} />
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-[var(--color-bg)]" style={{ background: r.color }}><Truck size={14} className="text-slate-950" /></span>
        <span className="relative h-2.5 w-2.5 rounded-full ring-4 ring-[var(--color-bg)]" style={{ background: r.color }} />
      </div>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-200">{r.from}</span>
        <span className="rounded-full bg-[var(--color-muted-bg)] px-2 py-0.5 text-[11px] font-light text-slate-300">{r.km.toString().replace('.', ',')} km · {r.load} % rempli</span>
        <span className="text-slate-200">{r.to}</span>
      </div>
    </motion.button>
  )
}

export default function App() {
  const mapRef = useRef(null)
  const spin = useRef(true)
  const [stopId, setStopId] = useState('s1')
  const [hud, setHud] = useState(true)
  const [orbit, setOrbit] = useState(true)
  const stop = STOPS.find((s) => s.id === stopId)
  const route = ROUTES.find((r) => r.id === stop.route)

  const totalKm = ROUTES.reduce((a, r) => a + r.km, 0)
  const saved = ROUTES.reduce((a, r) => a + r.km * 0.28 * CO2_PER_KM, 0) // tournée naïve ≈ +28 % de km
  const parcels = STOPS.reduce((a, s) => a + s.parcels, 0)

  const select = (s) => {
    setStopId(s.id); setHud(true); spin.current = false; setOrbit(false)
    mapRef.current?.flyTo({ center: s.coord, zoom: 12.8, pitch: 68, bearing: (Math.random() * 80) - 40, duration: 2400, essential: true })
  }
  const toggleOrbit = () => { spin.current = !spin.current; setOrbit(spin.current) }

  const onLoad = () => {
    const m = mapRef.current?.getMap(); if (!m) return
    try { m.setPaintProperty('satellite', 'raster-brightness-max', 0.55); m.setPaintProperty('satellite', 'raster-saturation', -0.25) } catch (e) { /* style sans couche satellite */ }
    let raf; let last = performance.now()
    const tick = (now) => { if (spin.current && !m.isMoving()) m.setBearing(m.getBearing() + ((now - last) / 1000) * 2.5); last = now; raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); m.once('remove', () => cancelAnimationFrame(raf))
  }

  useEffect(() => { if (mapRef.current) mapRef.current.getMap().easeTo({ pitch: 65, duration: 0 }) }, [])

  return (
    <div className="cdp flex min-h-screen items-center justify-center bg-[var(--color-bg-darker)] p-2 sm:p-4 lg:p-6">
      <style>{CSS}</style>
      <main className="app-shell relative flex h-[920px] max-h-[calc(100vh-16px)] min-h-[640px] w-full max-w-[1536px] flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[var(--color-bg)] shadow-2xl lg:flex-row">

        {/* ============ CARTE 3D ============ */}
        <section className="map-panel relative h-[55%] w-full overflow-hidden lg:h-full lg:w-[62%]">
          <Map ref={mapRef} mapboxAccessToken={MAPBOX_TOKEN} mapStyle="mapbox://styles/mapbox/satellite-v9"
            initialViewState={{ longitude: 6.86, latitude: 45.94, zoom: 11.3, pitch: 65, bearing: -25 }} maxPitch={80}
            terrain={{ source: 'mapbox-dem', exaggeration: 1.6 }}
            fog={{ color: 'rgb(12,20,37)', 'high-color': 'rgb(15,23,42)', 'horizon-blend': 0.2, 'space-color': 'rgb(10,17,32)', 'star-intensity': 0.15, range: [0.5, 9] }}
            onLoad={onLoad} onDragStart={() => { spin.current = false; setOrbit(false) }} style={{ width: '100%', height: '100%' }}>
            <Source id="mapbox-dem" type="raster-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={512} maxzoom={14} />
            {ROUTES.map((r) => {
              const on = r.id === route.id
              return (
                <Source key={r.id} id={`route-${r.id}`} type="geojson" data={geo(r)}>
                  <Layer id={`glow-${r.id}`} type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                    paint={{ 'line-color': r.color, 'line-width': on ? 16 : 0, 'line-blur': 10, 'line-opacity': 0.6 }} />
                  <Layer id={`core-${r.id}`} type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                    paint={{ 'line-color': r.color, 'line-width': on ? 4 : 2.5, 'line-opacity': on ? 1 : 0.45 }} />
                </Source>
              )
            })}
            {STOPS.map((s) => (
              <Marker key={s.id} longitude={s.coord[0]} latitude={s.coord[1]} anchor="center">
                <Pin s={s} active={s.id === stopId} color={ROUTES.find((r) => r.id === s.route).color} onClick={() => select(s)} />
              </Marker>
            ))}
          </Map>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-bg-darker)]/70 via-transparent to-[var(--color-bg-darker)]/60" />

          {/* Barre haute */}
          <div className="map-header absolute left-6 right-6 top-6 z-10 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <span className="map-brand text-3xl font-semibold tracking-tight text-white">CesiCDP</span>
              <nav aria-label="Navigation" className="map-nav glass flex items-center gap-1 rounded-full px-2 py-1.5">
                {[Home, BarChart3, Truck, RouteIcon, Star].map((I, i) => (
                  <button key={i} aria-label={['Accueil', 'Statistiques', 'Flotte', 'Tournées', 'Favoris'][i]}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${i === 0 ? 'bg-white text-slate-900' : 'text-white/80 hover:bg-white/10'}`}><I size={16} /></button>
                ))}
              </nav>
            </div>
            <div className="flex gap-2.5">
              <button aria-label="Filtres" className="glass relative flex h-10 w-10 items-center justify-center rounded-full text-white/90"><SlidersHorizontal size={16} />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent-pink)] text-[10px] font-black text-slate-950">3</span></button>
              <button aria-label="Exporter les feuilles de route" className="glass flex h-10 w-10 items-center justify-center rounded-full text-white/90"><Share2 size={16} /></button>
            </div>
          </div>

          <div className="map-meta absolute left-6 top-[88px] z-10">
            <h2 className="text-2xl font-light tracking-tight text-white">Tournées du jour</h2>
            <p className="mt-0.5 text-xs font-light text-white/70">{ROUTES.length} camions · {STOPS.length} arrêts · {parcels} colis</p>
          </div>

          {/* HUD flottant */}
          <AnimatePresence mode="wait">
            {hud && (
              <motion.div key={stop.id} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                className="floating-hud glass-light absolute bottom-20 left-6 z-20 w-[320px] rounded-3xl p-5 text-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-light text-slate-400">{route.name}</p>
                    <h3 className="text-lg font-extrabold leading-tight tracking-tight text-slate-900">{stop.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${STATUS_COLOR(stop.status)}22`, color: '#0f172a' }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR(stop.status) }} />{stop.status}
                    </span>
                    <button aria-label="Fermer" onClick={() => setHud(false)} className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-900"><X size={13} /></button>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div className="flex gap-3">
                    <div><p className="ml-1 text-[10px] font-light text-slate-400">Colis</p>
                      <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-black text-slate-950" style={{ background: route.color }}><Package size={13} />{stop.parcels}</div></div>
                    <div><p className="ml-1 text-[10px] font-light text-slate-400">Fenêtre</p>
                      <div className="rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{stop.win}</div></div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-extrabold text-slate-900">{stop.eta}<span className="font-light text-slate-400"> · {stop.dist}</span></span>
                    <Elevation route={route} t={stop.t} color={route.color === PAL.blue ? '#0ea5e9' : route.color} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="map-location-pill glass absolute bottom-6 left-6 z-10 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/95">
            <LocateFixed size={14} className="text-white/80" />Arrivée à {stop.eta}
          </div>
          <div className="map-zoom absolute bottom-6 right-6 z-10 flex flex-col gap-2">
            {[[orbit ? 'Arrêter l’orbite' : 'Lancer l’orbite', RotateCw, toggleOrbit], ['Zoom avant', Plus, () => mapRef.current?.zoomIn()], ['Zoom arrière', Minus, () => mapRef.current?.zoomOut()]].map(([l, I, fn]) => (
              <button key={l} aria-label={l} onClick={fn} className={`glass flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/60 ${l.includes('orbite') && orbit ? 'text-[var(--color-accent-blue)]' : 'text-white/80'}`}><I size={16} /></button>
            ))}
          </div>
        </section>

        {/* ============ DASHBOARD ============ */}
        <aside className="dashboard-panel no-scrollbar relative z-30 flex h-[45%] w-full flex-col gap-5 overflow-y-auto bg-[#f1f3f5] p-6 text-slate-800 shadow-[-30px_0_60px_-20px_rgba(2,6,23,.55)] lg:-ml-10 lg:h-full lg:w-[42%] lg:rounded-l-[44px] lg:pl-14 lg:pr-8 lg:pt-8 md:p-8">
          <header className="dashboard-header flex items-center gap-3">
            <label className="dashboard-controls relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Rechercher un client ou une tournée" className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 shadow-sm outline-none focus:border-[var(--color-accent-indigo)] focus:ring-2 focus:ring-[var(--color-accent-indigo)]/30" />
            </label>
            <button aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"><Bell size={16} />
              <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent-pink)] text-[9px] font-black text-slate-950">5</span></button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[var(--color-bg)] text-xs font-bold text-white shadow-sm">DN</div>
          </header>

          <section>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Flotte électrique</h1>
                <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-slate-950" style={{ background: route.color, boxShadow: `0 4px 14px -2px ${route.color}88` }}>{route.name.split(' · ')[0]} · {route.load} % rempli</span>
              </div>
              <button aria-label="Options" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"><MoreHorizontal size={16} /></button>
            </div>
            <div className="flex justify-center py-3"><TruckTopDown /></div>
          </section>

          <section className="stats-grid grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[['Distance', totalKm.toFixed(1).replace('.', ','), 'km'], ['Colis', parcels, 'livrés'], ['Remplissage', Math.round(ROUTES.reduce((a, r) => a + r.load, 0) / ROUTES.length), '%']].map(([l, v, u]) => (
              <div key={l} className="rounded-2xl bg-white p-3.5 shadow-sm">
                <p className="text-[11px] font-light text-slate-400">{l}</p>
                <p className="text-2xl font-black tracking-tight text-slate-900">{v}<span className="ml-1 text-xs font-light text-slate-400">{u}</span></p>
              </div>
            ))}
          </section>

          <section className="relative overflow-hidden rounded-3xl bg-[var(--color-bg-dark)] p-5 text-white">
            <div className="sheen absolute inset-x-0 top-0 h-0.5" style={{ backgroundImage: `linear-gradient(90deg, transparent, ${PAL.blue}, ${PAL.pink}, transparent)` }} />
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-muted-bg)] text-[var(--color-accent-blue)]"><Leaf size={22} /></div>
              <div>
                <p className="text-3xl font-black tracking-tight">−{saved.toFixed(1).replace('.', ',')} <span className="text-sm font-light text-[var(--color-muted-text)]">kg de CO₂</span></p>
                <p className="mt-0.5 text-xs font-light text-slate-300">Par rapport à une tournée non optimisée, soit environ {Math.max(1, Math.round(saved / 112))} aller-retour Paris–Lyon en voiture évité.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold tracking-tight text-slate-900">Dernières tournées <span className="text-xs font-light text-slate-400">{ROUTES.length}</span></h3>
              <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950">Tout voir</button>
            </div>
            {ROUTES.map((r) => (
              <Journey key={r.id} r={r} active={r.id === route.id} onClick={() => select(STOPS.find((s) => s.route === r.id))} />
            ))}
          </section>
        </aside>
      </main>
    </div>
  )
}
