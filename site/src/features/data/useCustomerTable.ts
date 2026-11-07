/**
 * Rôle : modèle de la table clients (tri, filtre par statut de fenêtre) avec TanStack Table v9, sans rendu.
 * Choix retenu : TanStack « headless » (logique de tri/filtre testée, rendu 100 % maîtrisé → accessibilité et
 *   virtualisation libres).
 * Alternative écartée : composant de grille tout fait (rendu imposé, ARIA difficile à corriger, dépendance lourde).
 */
import { useMemo } from 'react'
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_equals,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { twStatus, type TwStatus } from '@/lib/validation'
import type { Customer, Instance } from '@/types/vrp'

export type CustomerRow = Customer & { a: number | null; b: number | null; status: TwStatus }

const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortFns: { basic: sortFn_basic, text: sortFn_text },
  filterFns: { equals: filterFn_equals },
})

const col = createColumnHelper<typeof features, CustomerRow>()

export const COLUMNS = col.columns([
  col.accessor('id', { sortFn: 'basic' }),
  col.accessor('name', { sortFn: 'text' }),
  col.accessor('lat', { sortFn: 'basic' }),
  col.accessor('lng', { sortFn: 'basic' }),
  col.accessor('demand', { sortFn: 'basic' }),
  col.accessor((r) => r.a ?? -1, { id: 'a', sortFn: 'basic' }),
  col.accessor((r) => r.b ?? -1, { id: 'b', sortFn: 'basic' }),
  col.accessor('service', { sortFn: 'basic' }),
  col.accessor('status', { sortFn: 'text', filterFn: 'equals' }),
])

export type ColumnId = 'id' | 'name' | 'lat' | 'lng' | 'demand' | 'a' | 'b' | 'service' | 'status'

export function useCustomerTable(instance: Instance | null, statusFilter: TwStatus | 'all') {
  const data = useMemo<CustomerRow[]>(
    () => (instance?.customers ?? []).map((c) => ({ ...c, a: c.tw?.a ?? null, b: c.tw?.b ?? null, status: twStatus(c, instance?.depot ?? null) })),
    [instance],
  )
  const columnFilters = useMemo(() => (statusFilter === 'all' ? [] : [{ id: 'status', value: statusFilter }]), [statusFilter])
  const table = useTable({
    features,
    columns: COLUMNS,
    data,
    getRowId: (r) => String(r.id),
    state: { columnFilters },
    initialState: { sorting: [{ id: 'id', desc: false }] },
  })
  return { table, total: data.length }
}
