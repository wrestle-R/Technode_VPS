import { NextResponse } from "next/server"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { parseBigIntParam, parseRecipientPayload } from "@/lib/alerts/http"
import { deleteAlertRecipient, updateAlertRecipient } from "@/lib/alerts/store"

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
    return NextResponse.json({ error: "Invalid recipient id" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = parseRecipientPayload(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const recipient = await updateAlertRecipient({
    customerId: session.customerId,
    id: parsedId,
    data: {
      name: parsed.value.name,
      email: parsed.value.email,
      role: parsed.value.role,
      phone: parsed.value.phone,
      enabled: parsed.value.enabled,
    },
  })

  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
  }

  return NextResponse.json({ recipient })
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
    return NextResponse.json({ error: "Invalid recipient id" }, { status: 400 })
  }

  const removed = await deleteAlertRecipient(session.customerId, parsedId)
  if (!removed) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
