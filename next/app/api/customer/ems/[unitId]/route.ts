import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { getCustomerEmsUnitDetail } from "@/lib/ems/queries"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const session = await getCustomerSessionFromCookies()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { unitId } = await params
  const unit = await getCustomerEmsUnitDetail({
    customerId: session.customerId,
    unitId,
  })

  if (!unit) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 })
  }

  return NextResponse.json({ unit })
}
