/**
 * Rôle : reporte le thème du store sur <html data-theme>, ce qui bascule les variables --panel-* (tokens.css).
 */
import { useEffect } from 'react'
import { useUi } from '@/store/ui'

export function useThemeAttribute(): void {
  const theme = useUi((s) => s.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
}
