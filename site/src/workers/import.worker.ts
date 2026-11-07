/**
 * Rôle : lecture et validation des fichiers importés HORS du fil principal (CLAUDE.md §7 : aucune tâche > 100 ms
 *   ne doit bloquer l'interface pendant l'import de 1000 clients).
 * Choix retenu : Web Worker module natif (Vite le compile seul), messages typés.
 * Alternative écartée : analyse sur le fil principal découpée en morceaux (plus complexe, toujours saccadée).
 * Question probable du jury : « les données quittent-elles le navigateur ? » → non : le fichier est lu par
 *   FileReader puis traité ici, dans le même onglet ; aucun appel réseau.
 */
import { parseFile, type ImportResult } from '@/lib/parsers'

export interface ImportRequest {
  name: string
  text: string
}

export type ImportResponse = { ok: true; result: ImportResult; ms: number } | { ok: false; error: string }

self.onmessage = (e: MessageEvent<ImportRequest>) => {
  const t0 = performance.now()
  try {
    const result = parseFile(e.data.name, e.data.text)
    const msg: ImportResponse = { ok: true, result, ms: Math.round(performance.now() - t0) }
    self.postMessage(msg)
  } catch (err) {
    const msg: ImportResponse = { ok: false, error: err instanceof Error ? err.message : String(err) }
    self.postMessage(msg)
  }
}
