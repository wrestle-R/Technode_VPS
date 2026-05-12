import { notFound, redirect } from "next/navigation"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { getCustomerEmsUnitDetail } from "@/lib/ems/queries"
import { ExpandedChartPageClient } from "@/components/customer/ems/charts/expanded-chart-page-client"
import type { DashboardChartPanel } from "@/components/customer/ems/types"

const validPanels = new Set<DashboardChartPanel>([
  "voltage",
  "energy",
  "frequency",
  "amperage",
])

export const dynamic = "force-dynamic"

export default async function ExpandedChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string; panel: string }>
  searchParams: Promise<{ meter?: string }>
}) {
  const { unitId, panel } = await params
  const { meter } = await searchParams

  if (!validPanels.has(panel as DashboardChartPanel)) {
    notFound()
  }

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

  return (
    <ExpandedChartPageClient
      initialUnit={unit}
      initialPanel={panel as DashboardChartPanel}
      initialMeter={meter?.trim() || null}
    />
  )
}
