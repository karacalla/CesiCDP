/**
 * Essai S5 — animation du camion du panneau : (a) `offset-path` CSS animé par WAAPI sur `offset-distance`,
 * (b) images clés `transform` précalculées depuis `SVGPathElement.getPointAtLength`, jouées par WAAPI.
 * Mesures : tâches longues, décalages de mise en page (CLS), intervalle entre images, coût du précalcul.
 * Le test Playwright bloque ensuite le fil principal 900 ms et prend deux captures : si le camion bouge entre
 * elles, l'animation tourne sur le compositeur (indépendante du JavaScript).
 */
import { webglRenderer } from './common'

const mode = new URLSearchParams(location.search).get('mode') ?? 'waapi'
const truck = document.getElementById('truck') as HTMLElement
const pathEl = document.getElementById('p') as unknown as SVGPathElement
const longTasks: number[] = []
let cls = 0
new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration))).observe({ type: 'longtask' })
new PerformanceObserver((l) => l.getEntries().forEach((e) => { cls += (e as unknown as { value: number }).value })).observe({ type: 'layout-shift', buffered: true })

// trajet : de la baie du camion (dans le panneau) vers le coin supérieur droit, puis hors de l'écran
const W = window.innerWidth
const sx = W - 20 - 480 + 170
const sy = 300
const d = `M${sx} ${sy} C ${sx + 160} ${sy + 10}, ${W - 120} ${sy - 60}, ${W - 70} 90 S ${W + 40} -40, ${W + 160} -120`
pathEl.setAttribute('d', d)
const DURATION = 2800

function keyframesFromPath(): { frames: Keyframe[]; ms: number } {
  const t0 = performance.now()
  const len = pathEl.getTotalLength()
  const N = 48
  const frames: Keyframe[] = []
  for (let i = 0; i <= N; i++) {
    const f = i / N
    const p = pathEl.getPointAtLength(f * len)
    const q = pathEl.getPointAtLength(Math.min(len, f * len + 1))
    const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI
    const s = 1 - 0.25 * f
    frames.push({ offset: f, transform: `translate(${p.x - 70}px, ${p.y - 30}px) rotate(${angle}deg) scale(${s})`, opacity: f > 0.85 ? (1 - f) / 0.15 : 1 })
  }
  return { frames, ms: Math.round((performance.now() - t0) * 100) / 100 }
}

async function run() {
  let prepMs = 0
  let anim: Animation
  if (mode === 'offset') {
    truck.style.offsetPath = `path('${d}')`
    truck.style.offsetRotate = 'auto'
    truck.style.offsetAnchor = '50% 50%'
    anim = truck.animate([{ offsetDistance: '0%', scale: '1' }, { offsetDistance: '100%', scale: '0.75' }], { duration: DURATION, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' })
  } else {
    const k = keyframesFromPath()
    prepMs = k.ms
    truck.style.willChange = 'transform, opacity'
    anim = truck.animate(k.frames, { duration: DURATION, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' })
  }
  const frameD: number[] = []
  let last = performance.now()
  const tick = (now: number) => { frameD.push(now - last); last = now; if (anim.playState === 'running') requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
  await anim.finished
  frameD.sort((a, b) => a - b)
  window.__spike = {
    spike: 'S5', mode, renderer: webglRenderer(), prepMs,
    p95FrameMs: Math.round((frameD[Math.floor(frameD.length * 0.95)] ?? 0) * 10) / 10,
    longTasks: longTasks.map(Math.round), cls: Math.round(cls * 1000) / 1000,
  }
  // second passage pour le test de blocage : relancé à la demande
  ;(window as unknown as { replay: () => void }).replay = () => { anim.cancel(); anim.play() }
}
void run()
