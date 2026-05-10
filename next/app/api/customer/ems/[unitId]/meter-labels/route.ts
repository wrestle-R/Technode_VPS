import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type UpdateMeterLabelBody = {
  meterKey?: string
  label?: string
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

  let body: UpdateMeterLabelBody
  try {
    body = (await request.json()) as UpdateMeterLabelBody
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const meterKey = body.meterKey?.trim()
  if (!meterKey) {
    return NextResponse.json({ error: "meterKey is required" }, { status: 400 })
  }

  const label = body.label?.trim() ?? ""
  if (label.length > 120) {
    return NextResponse.json(
      { error: "Label must be 120 characters or fewer" },
      { status: 400 }
    )
  }

  const unit = await prisma.emsUnit.findFirst({
    where: {
      unit_id: unitId,
      customer_id: session.customerId,
    },
    select: { id: true },
  })

  if (!unit) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 })
  }

  if (!label) {
    await prisma.emsMeterLabel.deleteMany({
      where: {
        ems_unit_id: unit.id,
        meter_key: meterKey,
      },
    })

    return NextResponse.json({ ok: true, meterKey, label: null })
  }

  const saved = await prisma.emsMeterLabel.upsert({
    where: {
      ems_unit_id_meter_key: {
        ems_unit_id: unit.id,
        meter_key: meterKey,
      },
    },
    update: {
      label,
    },
    create: {
      ems_unit_id: unit.id,
      meter_key: meterKey,
      label,
    },
  })

  return NextResponse.json({
    ok: true,
    meterKey: saved.meter_key,
    label: saved.label,
  })
}
