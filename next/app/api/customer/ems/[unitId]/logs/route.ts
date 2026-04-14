import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { getCustomerEmsLogsPage } from "@/lib/ems/queries"

function parseLimit(raw: string | null) {
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  if (!Number.isFinite(parsed)) {
    return 50
  }
  return Math.min(Math.max(parsed, 1), 200)
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
  const cursor = url.searchParams.get("cursor")?.trim() || null
  const limit = parseLimit(url.searchParams.get("limit"))

  try {
    const page = await getCustomerEmsLogsPage({
      customerId: session.customerId,
      unitId,
      cursor,
      limit,
    })

    if (!page) {
      return NextResponse.json({ error: "Unit not found." }, { status: 404 })
    }

    return NextResponse.json(page)
  } catch {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 })
  }
}
