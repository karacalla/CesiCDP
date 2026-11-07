/**
 * Rôle : lit un fichier choisi par l'utilisateur et le confie au Web Worker d'import ; le fil principal ne fait
 *   que lire le texte (asynchrone) et recevoir le résultat.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImportResponse } from '@/workers/import.worker'
import { useVrp } from '@/store/vrp'

export function useImport() {
  const workerRef = useRef<Worker | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const applyImport = useVrp((s) => s.applyImport)

  useEffect(() => () => workerRef.current?.terminate(), [])

  const importFile = useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      const text = await file.text()
      workerRef.current ??= new Worker(new URL('../../workers/import.worker.ts', import.meta.url), { type: 'module' })
      const worker = workerRef.current
      const response = await new Promise<ImportResponse>((resolve) => {
        worker.onmessage = (e: MessageEvent<ImportResponse>) => resolve(e.data)
        worker.onerror = (e) => resolve({ ok: false, error: e.message })
        worker.postMessage({ name: file.name, text })
      })
      if (response.ok) applyImport(response.result, file.name, response.ms)
      else setError(response.error)
      setBusy(false)
    },
    [applyImport],
  )

  return { importFile, busy, error }
}
