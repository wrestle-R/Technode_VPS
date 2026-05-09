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
  const meterKey = url.searchParams.get("meterKey")?.trim()

  if (!meterKey) {
    return NextResponse.json({ error: "Missing meterKey" }, { status: 400 })
  }

  const hourly = await getCustomerEmsVoltageHourlyStats({
    customerId: session.customerId,
    unitId,
    meterKey,
  })

  if (!hourly) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 })
  }

  return NextResponse.json({ hourly })
}
