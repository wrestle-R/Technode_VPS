import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { getCustomerEmsVoltageHourlyStats } from "@/lib/ems/queries"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const session = await getCustomerSessionFromCookies()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { unitId } = await params
  const url = new URL(request.url)
  const rtuKey = url.searchParams.get("rtuKey")?.trim()

  if (!rtuKey) {
    return NextResponse.json({ error: "Missing rtuKey" }, { status: 400 })
  }

  const hourly = await getCustomerEmsVoltageHourlyStats({
    customerId: session.customerId,
    unitId,
    rtuKey,
  })

  if (!hourly) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 })
  }

  return NextResponse.json({ hourly })
}
