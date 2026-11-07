/**
 * Rôle : remettre un fichier généré localement à l'utilisateur : téléchargement (`Blob` + lien temporaire, URL
 *   révoquée aussitôt) ou feuille de partage du système (Web Share) quand le navigateur accepte les fichiers.
 */
export function download(content: string, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // révocation différée : certains navigateurs lisent l'URL après le clic
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/** Partage système du fichier si possible (téléphone, tablette), sinon téléchargement. */
export async function shareOrDownload(content: string, fileName: string, type: string, title: string): Promise<ShareOutcome> {
  const file = new File([content], fileName, { type })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  download(content, fileName, type)
  return 'downloaded'
}
