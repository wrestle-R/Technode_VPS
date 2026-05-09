import { getCustomerSessionFromCookies } from "@/lib/auth"
import { CustomerDevicesPageClient } from "@/components/customer/ems/devices-page-client"
import { getCustomerEmsUnits } from "@/lib/ems/queries"

export const dynamic = "force-dynamic"

export default async function CustomerDevicesPage() {
  const session = await getCustomerSessionFromCookies()
  const units = session ? await getCustomerEmsUnits(session.customerId) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">EMS Devices</h1>
        <p className="text-sm text-muted-foreground">Select a unit to inspect mapped meters and recent snapshots.</p>
      </div>

      <CustomerDevicesPageClient initialUnits={units} />
    </div>
  )
}
