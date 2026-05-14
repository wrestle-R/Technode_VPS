import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import {
  EmsDisplayNameNotFoundError,
  EmsDisplayNameValidationError,
  updateCustomerEmsDisplayName,
} from "@/lib/ems/display-name-service"

type UpdateDisplayNameBody = {
  displayName?: string | null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { unitId } = await params

  let body: UpdateDisplayNameBody
  try {
    body = (await request.json()) as UpdateDisplayNameBody
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  try {
    const updated = await updateCustomerEmsDisplayName({
      customerId: session.customerId,
      unitId,
      displayName: body.displayName,
    })

    return NextResponse.json({
      ok: true,
      unitId: updated.unitId,
      displayName: updated.displayName,
    })
  } catch (error) {
    if (error instanceof EmsDisplayNameValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof EmsDisplayNameNotFoundError) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "Failed to update display name" },
      { status: 500 }
    )
  }
}
