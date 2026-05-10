import { notFound, redirect } from "next/navigation"

import { UnitOverviewPageClient } from "@/components/customer/ems/unit-overview-page-client"
import { getCustomerSessionFromCookies } from "@/lib/auth"
import { getCustomerEmsUnitDetail } from "@/lib/ems/queries"

export const dynamic = "force-dynamic"

export default async function CustomerUnitOverviewPage({
  params,
}: {
  params: Promise<{ unitId: string }>
}) {
  const { unitId } = await params

  const session = await getCustomerSessionFromCookies()
  if (!session) {
    redirect("/login")
  }

  const unit = await getCustomerEmsUnitDetail({
    customerId: session.customerId,
    unitId,
  })

  if (!unit) {
    notFound()
  }

  return <UnitOverviewPageClient unit={unit} />
}
