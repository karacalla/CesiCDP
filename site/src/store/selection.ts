/**
 * Rôle : ce que le dispatcher regarde : camion sélectionné, arrêt sélectionné, heure affichée sur la carte.
 *   Partagé par la carte (tracé, pins, curseur), la carte d'info et le panneau (cartes de tournées, liste d'arrêts).
 */
import { create } from 'zustand'
import { DEMO_CLOCK } from '@/config/app'

interface SelectionState {
  vehicleId: number | null
  stopId: number | null
  clock: number
  selectVehicle: (id: number | null) => void
  selectStop: (customerId: number | null, vehicleId?: number | null) => void
  setClock: (t: number) => void
  clear: () => void
}

export const useSelection = create<SelectionState>((set) => ({
  vehicleId: null,
  stopId: null,
  clock: DEMO_CLOCK,
  selectVehicle: (vehicleId) => set({ vehicleId, stopId: null }),
  selectStop: (stopId, vehicleId) => set((s) => ({ stopId, vehicleId: vehicleId === undefined ? s.vehicleId : vehicleId })),
  setClock: (clock) => set({ clock }),
  clear: () => set({ vehicleId: null, stopId: null }),
}))
