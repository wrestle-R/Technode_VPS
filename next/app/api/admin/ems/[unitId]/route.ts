import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { hasAdminSession } from "@/lib/admin-auth"
import { getAdminEmsUnit } from "@/lib/ems/queries"
import { normalizeFieldTemplate, normalizeRtuOverrides } from "@/lib/ems/service"
import { prisma } from "@/lib/prisma"

type UpdateEmsUnitBody = {
  customerId?: number | null
  locationLabel?: string | null
  latitude?: number | null
  longitude?: number | null
  unitFieldTemplate?: unknown
  rtuOverrides?: unknown
}

function asJson(value: unknown) {
  return value as Prisma.InputJsonValue
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
  const body = (await request.json()) as UpdateEmsUnitBody

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

  const unitFieldTemplate = normalizeFieldTemplate(body.unitFieldTemplate)
  const rtuOverrides = normalizeRtuOverrides(body.rtuOverrides)

  await prisma.emsUnit.update({
    where: { unit_id: unitId },
    data: {
      customer_id: customerId,
      location_label: body.locationLabel?.trim() || null,
      latitude,
      longitude,
      unit_field_template: asJson(unitFieldTemplate),
      rtu_overrides: asJson(rtuOverrides),
    },
  })

  const unit = await getAdminEmsUnit(unitId)
  return NextResponse.json({ ok: true, unit })
}
