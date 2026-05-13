import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { parseBigIntParam } from "@/lib/alerts/http"
import { markAlertSeen } from "@/lib/alerts/store"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const parsedId = parseBigIntParam(id)
  if (!parsedId) {
    return NextResponse.json({ error: "Invalid alert id" }, { status: 400 })
  }

  const alert = await markAlertSeen(session.customerId, parsedId)
  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 })
  }

  return NextResponse.json({ alert })
}
