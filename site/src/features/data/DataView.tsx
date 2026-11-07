/**
 * Rôle : vue « Données » : instance, import, dépôt, flotte, clients.
 */
import { CustomerTable } from './CustomerTable'
import { DepotForm } from './DepotForm'
import { FleetForm } from './FleetForm'
import { ImportPanel } from './ImportPanel'
import { InstancePicker } from './InstancePicker'

export function DataView() {
  return (
    <div className="flex flex-col gap-4">
      <InstancePicker />
      <ImportPanel />
      <DepotForm />
      <FleetForm />
      <CustomerTable />
    </div>
  )
}
