/**
 * Rôle : données métier de la session (instance courante) et leurs modifications (CRUD clients, dépôt, flotte).
 * Choix retenu : le store ne contient QUE des données valides (chaque modification passe par Zod) ; une saisie
 *   invalide reste dans le champ, avec son message, et n'atteint jamais le store ni le solveur.
 * Question probable du jury : « où vit l'instance importée ? » → ici, en mémoire de l'onglet ; rien n'est envoyé.
 */
import { create } from 'zustand'
import { api } from '@/services/api'
import { useRun } from '@/store/run'
import type { ImportIssue, ImportResult } from '@/lib/parsers'
import { validateCustomer, type FieldError } from '@/lib/validation'
import { CustomerSchema, DepotSchema, FleetSchema, InstanceSchema, OptionsSchema, TrafficSchema, type Customer, type Depot, type Fleet, type Instance, type Options, type TrafficSlot } from '@/types/vrp'

export interface ImportReport {
  fileName: string
  format: ImportResult['format']
  rows: number
  accepted: number
  issues: ImportIssue[]
  workerMs: number
}

interface VrpState {
  instance: Instance | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  importReport: ImportReport | null
  load: (id: string) => Promise<void>
  applyImport: (result: ImportResult, fileName: string, workerMs: number) => void
  updateCustomer: (id: number, patch: Partial<Customer>) => FieldError[]
  addCustomer: () => number | null
  removeCustomer: (id: number) => void
  setDepot: (d: Depot) => boolean
  setFleet: (f: Fleet) => boolean
  /** Remplace les tranches de trafic ; renvoie les messages d'erreur (vide si accepté). */
  setTraffic: (slots: TrafficSlot[]) => string[]
  setOptions: (o: Partial<Options>) => void
}

export const useVrp = create<VrpState>((set, get) => ({
  instance: null,
  status: 'idle',
  error: null,
  importReport: null,

  load: async (id) => {
    set({ status: 'loading', error: null })
    try {
      const instance = await api.getInstance(id)
      set({ instance, status: 'ready', importReport: null })
      useRun.getState().reset()
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },

  applyImport: (result, fileName, workerMs) => {
    const current = get().instance
    let instance: Instance | null = result.instance
    // un CSV ou un tableau JSON ne contient que des clients : on garde dépôt, flotte et trafic courants
    if (!instance && current && result.customers.length > 0) {
      const candidate = { ...current, id: fileName, name: fileName, customers: result.customers, meta: { ...current.meta, source: result.format, note: undefined } }
      const parsed = InstanceSchema.safeParse(candidate)
      instance = parsed.success ? parsed.data : null
    }
    set({
      instance: instance ?? current,
      status: instance || current ? 'ready' : get().status,
      importReport: { fileName, format: result.format, rows: result.rows, accepted: instance ? result.customers.length : 0, issues: result.issues, workerMs },
    })
  },

  updateCustomer: (id, patch) => {
    const inst = get().instance
    const current = inst?.customers.find((c) => c.id === id)
    if (!inst || !current) return [{ field: 'id', message: 'client introuvable' }]
    const next = { ...current, ...patch }
    const errors = validateCustomer(next, inst.meta.coordinates)
    if (errors.length) return errors
    set({ instance: { ...inst, customers: inst.customers.map((c) => (c.id === id ? CustomerSchema.parse(next) : c)) } })
    return []
  },

  addCustomer: () => {
    const inst = get().instance
    if (!inst) return null
    const id = inst.customers.reduce((m, c) => Math.max(m, c.id), 0) + 1
    const c: Customer = { id, name: `Nouveau client ${id}`, lat: inst.depot.lat, lng: inst.depot.lng, demand: 1, tw: null, service: 5 }
    set({ instance: { ...inst, customers: [...inst.customers, c] } })
    return id
  },

  removeCustomer: (id) => {
    const inst = get().instance
    if (inst) set({ instance: { ...inst, customers: inst.customers.filter((c) => c.id !== id) } })
  },

  setDepot: (d) => {
    const inst = get().instance
    const p = DepotSchema.safeParse(d)
    if (!inst || !p.success) return false
    set({ instance: { ...inst, depot: p.data } })
    return true
  },

  setFleet: (f) => {
    const inst = get().instance
    const p = FleetSchema.safeParse(f)
    if (!inst || !p.success) return false
    set({ instance: { ...inst, fleet: p.data } })
    return true
  },

  setTraffic: (slots) => {
    const inst = get().instance
    if (!inst) return ['aucune instance']
    const p = TrafficSchema.safeParse({ slots })
    if (!p.success) return [...new Set(p.error.issues.map((i) => i.message))]
    set({ instance: { ...inst, traffic: p.data } })
    return []
  },

  setOptions: (o) => {
    const inst = get().instance
    const p = OptionsSchema.safeParse({ ...inst?.options, ...o })
    if (inst && p.success) set({ instance: { ...inst, options: p.data } })
  },
}))
