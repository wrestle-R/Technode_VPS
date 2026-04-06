import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { getCustomerEmsUnits } from "@/lib/ems/queries"

export async function GET() {
  const session = await getCustomerSessionFromCookies()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const units = await getCustomerEmsUnits(session.customerId)
  return NextResponse.json({ units })
}
