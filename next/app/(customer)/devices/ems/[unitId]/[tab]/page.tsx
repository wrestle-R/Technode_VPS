import { notFound } from "next/navigation"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { CustomerUnitTabClient } from "@/components/customer/ems/unit-tab-client"
import { getCustomerEmsUnitDetail } from "@/lib/ems/queries"

const validTabs = new Set(["overview", "charts", "logs"])

export const dynamic = "force-dynamic"

export default async function CustomerUnitTabPage({
  params,
}: {
  params: Promise<{ unitId: string; tab: string }>
}) {
  const { unitId, tab } = await params

  if (!validTabs.has(tab)) {
    notFound()
  }

  const session = await getCustomerSessionFromCookies()
  if (!session) {
    notFound()
  }

  const unit = await getCustomerEmsUnitDetail({
    customerId: session.customerId,
    unitId,
  })

  if (!unit) {
    notFound()
  }

  return <CustomerUnitTabClient initialUnit={unit} tab={tab} />
}
