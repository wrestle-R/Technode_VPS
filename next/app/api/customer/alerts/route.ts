import { NextResponse } from "next/server"

import { isAlertRuleType, isAlertSeverity, isAlertStatus } from "@/lib/alerts/types"
import { getCustomerSessionFromCookies } from "@/lib/auth"
import { listAlertInstances, listRecentOpenUnseenAlerts } from "@/lib/alerts/store"

export async function GET(request: Request) {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const statusRaw = (url.searchParams.get("status") ?? "").trim().toLowerCase()
  const severityRaw = (url.searchParams.get("severity") ?? "").trim().toLowerCase()
  const typeRaw = (url.searchParams.get("type") ?? "").trim().toLowerCase()
  const seenRaw = (url.searchParams.get("seen") ?? "").trim().toLowerCase()
  const unitId = (url.searchParams.get("unitId") ?? "").trim() || undefined
  const meterKey = (url.searchParams.get("meterKey") ?? "").trim() || undefined
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10)
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10)
  const mode = (url.searchParams.get("mode") ?? "").trim().toLowerCase()

  if (mode === "recent") {
    const rows = await listRecentOpenUnseenAlerts(session.customerId, limit)
    return NextResponse.json({ rows })
  }

  const status = isAlertStatus(statusRaw) ? statusRaw : undefined
  const severity = isAlertSeverity(severityRaw) ? severityRaw : undefined
  const type = isAlertRuleType(typeRaw) ? typeRaw : undefined
  const seen = seenRaw === "true" || seenRaw === "false" ? seenRaw : undefined

  const result = await listAlertInstances(session.customerId, {
    status,
    severity,
    type,
    seen,
    unitId,
    meterKey,
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 20,
  })

  return NextResponse.json(result)
}
