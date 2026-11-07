/**
 * Rôle : import de fichier (traité dans un Web Worker) et rapport d'erreurs ligne par ligne.
 */
import { useId, useRef } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { Section } from '@/components/ui/Section'
import { fr } from '@/i18n/fr'
import { useVrp } from '@/store/vrp'
import { useImport } from './useImport'

const MAX_SHOWN = 100

export function ImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const { importFile, busy, error } = useImport()
  const report = useVrp((s) => s.importReport)

  return (
    <Section title={fr.data.importTitle}>
      <p id={hintId} className="text-xs text-panel-ink-2">{fr.data.importHint}</p>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,.vrp,.txt"
          aria-describedby={hintId}
          className="sr-only"
          id="import-file"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importFile(f)
            e.target.value = ''
          }}
        />
        <label htmlFor="import-file" className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-panel-line bg-panel-surface px-4 text-sm font-semibold text-panel-ink hover:border-panel-ink-2 has-[:focus-visible]:outline-2">
          {busy ? <Loader2 size={16} aria-hidden className="animate-spin" /> : <FileUp size={16} aria-hidden />}
          {busy ? fr.data.importing : fr.data.importButton}
        </label>
      </div>
      <div aria-live="polite">
        {error && <p className="text-sm text-panel-late">{error}</p>}
        {report && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-panel-ink">
              <strong className="font-semibold">{report.fileName}</strong> — {fr.data.importSummary(report.rows, report.accepted, report.issues.length, report.workerMs)}
            </p>
            {report.issues.length > 0 && (
              <details open={report.issues.length <= 10} className="rounded-xl border border-panel-line p-3">
                <summary className="cursor-pointer text-sm font-semibold text-panel-ink">
                  {fr.data.issuesTitle} ({report.issues.length})
                </summary>
                <ol className="mt-2 flex max-h-56 flex-col gap-1 overflow-auto text-xs">
                  {report.issues.slice(0, MAX_SHOWN).map((i, k) => (
                    <li key={k} className="text-panel-ink">
                      <span className="font-semibold text-panel-late">{fr.data.issueLine(i.line)}</span> — {i.message}
                    </li>
                  ))}
                  {report.issues.length > MAX_SHOWN && <li className="text-panel-ink-2">{fr.data.moreIssues(report.issues.length - MAX_SHOWN)}</li>}
                </ol>
              </details>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}
