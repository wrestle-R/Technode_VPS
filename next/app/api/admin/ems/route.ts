import { NextResponse } from "next/server"

import { hasAdminSession } from "@/lib/admin-auth"
import { getAdminEmsCustomersWithUnits, getAdminEmsUnitsFiltered } from "@/lib/ems/queries"

export async function GET(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const assignmentValue = searchParams.get("assignment")
  const customerIdValue = searchParams.get("customerId")

  const assignment =
    assignmentValue === "assigned" || assignmentValue === "unassigned" ? assignmentValue : "all"
  const customerId = customerIdValue ? Number(customerIdValue) : undefined

  const [units, customers] = await Promise.all([
    getAdminEmsUnitsFiltered({
      assignment,
      customerId: typeof customerId === "number" && !Number.isNaN(customerId) ? customerId : undefined,
    }),
    getAdminEmsCustomersWithUnits(),
  ])

  return NextResponse.json({ units, customers })
}
