import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { hasAdminSession } from "@/lib/admin-auth"
import { getAdminEmsUnit } from "@/lib/ems/queries"
import { prisma } from "@/lib/prisma"

type UpdateEmsUnitBody = {
  customerId?: number | null
  locationLabel?: string | null
  latitude?: number | null
  longitude?: number | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { unitId } = await params
  const unit = await getAdminEmsUnit(unitId)

  if (!unit) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 })
  }

  return NextResponse.json({ unit })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { unitId } = await params
  let body: UpdateEmsUnitBody

  try {
    body = (await request.json()) as UpdateEmsUnitBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (
    "scalingFactor" in (body as Record<string, unknown>) ||
    "unitFieldTemplate" in (body as Record<string, unknown>) ||
    "rtuOverrides" in (body as Record<string, unknown>)
  ) {
    return NextResponse.json(
      { error: "Legacy mapping/scaling fields are no longer supported." },
      { status: 400 }
    )
  }

  const customerId =
    body.customerId == null || body.customerId === 0 ? null : Number(body.customerId)
  const latitude = body.latitude == null ? null : Number(body.latitude)
  const longitude = body.longitude == null ? null : Number(body.longitude)

  if (customerId != null && Number.isNaN(customerId)) {
    return NextResponse.json({ error: "Invalid customer ID." }, { status: 400 })
  }

  if (latitude != null && Number.isNaN(latitude)) {
    return NextResponse.json({ error: "Invalid latitude." }, { status: 400 })
  }

  if (longitude != null && Number.isNaN(longitude)) {
    return NextResponse.json({ error: "Invalid longitude." }, { status: 400 })
  }

  try {
    await prisma.emsUnit.update({
      where: { unit_id: unitId },
      data: {
        customer:
          customerId == null
            ? { disconnect: true }
            : {
                connect: {
                  customer_id: customerId,
                },
              },
        location_label: body.locationLabel?.trim() || null,
        latitude,
        longitude,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Unit not found." }, { status: 404 })
      }

      if (error.code === "P2003") {
        return NextResponse.json({ error: "Invalid customer reference." }, { status: 400 })
      }
    }

    return NextResponse.json({ error: "Failed to update EMS unit." }, { status: 500 })
  }

  const unit = await getAdminEmsUnit(unitId)
  return NextResponse.json({ ok: true, unit })
}
