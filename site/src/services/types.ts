/**
 * Rôle : interface commune des implémentations de l'API (mock et HTTP).
 */
import type { Instance } from '@/types/vrp'

export interface InstanceSummary {
  id: string
  name: string
  customers: number
  hasGeometry: boolean
}

export interface ApiClient {
  readonly mode: 'mock' | 'http'
  listInstances(): Promise<InstanceSummary[]>
  getInstance(id: string): Promise<Instance>
}
