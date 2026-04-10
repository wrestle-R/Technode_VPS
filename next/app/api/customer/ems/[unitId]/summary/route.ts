import { NextResponse } from "next/server"

import type { SummaryRange } from "@/components/customer/ems/types"
import { getCustomerSessionFromCookies } from "@/lib/auth"
import { getCustomerEmsSummaryStats } from "@/lib/ems/queries"

function parseRange(raw: string | null): SummaryRange {
  if (raw === "24h" || raw === "7d" || raw === "30d") {
    return raw
  }

  return "7d"
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
  const range = parseRange(url.searchParams.get("range"))
  const rtuKey = url.searchParams.get("rtuKey")?.trim()

  if (!rtuKey) {
    return NextResponse.json({ error: "Missing rtuKey" }, { status: 400 })
  }

  const summary = await getCustomerEmsSummaryStats({
    customerId: session.customerId,
    unitId,
    rtuKey,
    range,
  })

  if (!summary) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 })
  }

  return NextResponse.json({ summary })
}
