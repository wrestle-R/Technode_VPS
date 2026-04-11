import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { getCustomerEmsEnergyAnalytics } from "@/lib/ems/queries"

type EnergyDailyRange = "3d" | "7d" | "30d"

function parseDailyRange(raw: string | null): EnergyDailyRange {
  if (raw === "3d" || raw === "7d" || raw === "30d") {
    return raw
  }

  return "30d"
}

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
  const dailyRange = parseDailyRange(url.searchParams.get("dailyRange"))

  if (!rtuKey) {
    return NextResponse.json({ error: "Missing rtuKey" }, { status: 400 })
  }

  const analytics = await getCustomerEmsEnergyAnalytics({
    customerId: session.customerId,
    unitId,
    rtuKey,
    dailyRange,
  })

  if (!analytics) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 })
  }

  return NextResponse.json({ analytics })
}
