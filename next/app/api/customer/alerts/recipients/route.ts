import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { createAlertRecipient, listAlertRecipients } from "@/lib/alerts/store"
import { parseRecipientPayload } from "@/lib/alerts/http"

export async function GET() {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await listAlertRecipients(session.customerId)
  return NextResponse.json({ rows })
}

export async function POST(request: Request) {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  try {
    const recipient = await createAlertRecipient({
      customerId: session.customerId,
      ...parsed.value,
    })

    return NextResponse.json({ recipient }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Recipient email already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Unable to create recipient" }, { status: 500 })
  }
}
