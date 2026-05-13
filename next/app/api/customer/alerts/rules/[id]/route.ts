import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { deleteAlertRule, updateAlertRule } from "@/lib/alerts/store"
import { parseBigIntParam, parseRulePayload } from "@/lib/alerts/http"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const parsedId = parseBigIntParam(id)
  if (!parsedId) {
    return NextResponse.json({ error: "Invalid rule id" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = parseRulePayload(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const rule = await updateAlertRule({
    customerId: session.customerId,
    id: parsedId,
    data: {
      unit_id: parsed.value.unitId,
      type: parsed.value.type,
      severity: parsed.value.severity,
      enabled: parsed.value.enabled,
      meter_scope: parsed.value.meterScope,
      meter_keys: parsed.value.meterKeys,
      field_key: parsed.value.fieldKey,
      direction: parsed.value.direction,
      threshold_value: parsed.value.thresholdValue,
    },
  })

  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  return NextResponse.json({ rule })
}

export async function DELETE(
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
    return NextResponse.json({ error: "Invalid rule id" }, { status: 400 })
  }

  const removed = await deleteAlertRule(session.customerId, parsedId)
  if (!removed) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
