/**
 * Rôle : couleurs des graphiques lues dans les jetons CSS (Recharts attend des couleurs résolues, pas des var()).
 *   Relues à chaque changement de thème : le sombre a ses propres teintes validées, pas une inversion.
 */
import { useMemo } from 'react'
import { useUi } from '@/store/ui'

export interface ChartColors {
  series1: string
  series2: string
  ink: string
  ink2: string
  grid: string
  surface: string
  late: string
}

export function useChartColors(): ChartColors {
  const theme = useUi((s) => s.theme)
  return useMemo(() => {
    const cs = getComputedStyle(document.documentElement)
    const v = (name: string, fallback: string): string => cs.getPropertyValue(name).trim() || fallback
    return {
      series1: v('--chart-1', '#4f46e5'),
      series2: v('--chart-2', '#b45309'),
      ink: v('--panel-ink', '#0f172a'),
      ink2: v('--panel-ink-2', '#475569'),
      grid: v('--panel-line', '#e2e8f0'),
      surface: v('--panel-surface', '#ffffff'),
      late: v('--panel-late', '#be185d'),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- le thème change les variables lues
  }, [theme])
}
