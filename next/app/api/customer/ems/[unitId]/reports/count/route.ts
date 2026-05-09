import { format } from "date-fns"
import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { countCustomerEmsRawRows } from "@/lib/ems/queries"

function parseDateAtStart(raw: string | null) {
  if (!raw) {
    return undefined
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  date.setHours(0, 0, 0, 0)
  return date
}

function parseDateAtEnd(raw: string | null) {
  if (!raw) {
    return undefined
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  date.setHours(23, 59, 59, 999)
  return date
}

function parseWindowDates(raw: string | null) {
  if (!raw) {
    return { startAt: undefined, endAt: undefined }
  }

  const now = new Date()
  if (raw === "24h") {
    return {
      startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      endAt: now,
    }
  }

  if (raw === "7d") {
    return {
      startAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endAt: now,
    }
  }

  if (raw === "30d") {
    return {
      startAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endAt: now,
    }
  }

  if (raw === "custom") {
    return { startAt: undefined, endAt: undefined }
  }

  return { startAt: undefined, endAt: undefined }
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
  const meterKey = url.searchParams.get("meterKey")?.trim()
  if (!meterKey) {
    return NextResponse.json({ error: "Missing meterKey" }, { status: 400 })
  }

  const reportRange = url.searchParams.get("reportRange")
  const parsedRange = parseWindowDates(reportRange)
  const startAt =
    parseDateAtStart(url.searchParams.get("startDate")) ?? parsedRange.startAt
  const endAt = parseDateAtEnd(url.searchParams.get("endDate")) ?? parsedRange.endAt

  const rowCount = await countCustomerEmsRawRows({
    customerId: session.customerId,
    unitId,
    meterKey,
    startAt,
    endAt,
  })

  if (rowCount == null) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 })
  }

  return NextResponse.json({
    rowCount,
    range: {
      startAt: startAt ? format(startAt, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : null,
      endAt: endAt ? format(endAt, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : null,
    },
  })
}
