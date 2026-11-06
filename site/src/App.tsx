/**
 * Rôle : racine de l'application. En phase 0, simple page de contrôle du socle (remplacée par la coque en phase 1).
 * Question probable du jury : « où est la logique ? » → dans les hooks et services, jamais ici.
 */
import { fr } from '@/i18n/fr'

export function App() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <section className="max-w-xl rounded-frame border border-white/10 bg-bg p-10">
        <p className="text-sm font-light tracking-wide text-muted-text-aa">{fr.app.title}</p>
        <h1 className="mt-2 text-3xl font-bold text-on-dark">{fr.p0.heading}</h1>
        <p className="mt-4 text-base text-muted-text-aa">{fr.p0.body}</p>
        <span className="mt-6 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent">P0</span>
      </section>
    </main>
  )
}
