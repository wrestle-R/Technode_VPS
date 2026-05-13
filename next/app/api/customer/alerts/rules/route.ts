import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import { createAlertRule, listAlertRules } from "@/lib/alerts/store"
import { parseRulePayload } from "@/lib/alerts/http"

export async function GET() {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await listAlertRules(session.customerId)
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

  const parsed = parseRulePayload(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  try {
    const rule = await createAlertRule({
      customerId: session.customerId,
      ...parsed.value,
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Duplicate rule data for this customer." }, { status: 409 })
    }

    return NextResponse.json({ error: "Unable to create alert rule" }, { status: 500 })
  }
}
