import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { markAllAlertsSeen } from "@/lib/alerts/store"

export async function POST() {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const updated = await markAllAlertsSeen(session.customerId)
  return NextResponse.json({ updated })
}
