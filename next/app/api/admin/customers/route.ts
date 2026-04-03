import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { prisma } from "@/lib/prisma"
import { ADMIN_SESSION_COOKIE } from "@/lib/session-cookies"

type CreateCustomerBody = {
  company_name?: string
  customer_representative?: string
  email?: string
  phone?: string
  remark?: string
  password?: string
}

async function hasAdminSession() {
  const store = await cookies()
  return store.get(ADMIN_SESSION_COOKIE)?.value === "1"
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const customers = await prisma.customer.findMany({
    orderBy: { customer_id: "asc" },
    select: {
      customer_id: true,
      company_name: true,
      customer_representative: true,
      email: true,
      phone: true,
      remark: true,
    },
  })

  return NextResponse.json({ customers })
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as CreateCustomerBody

  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ""

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required." },
      { status: 400 }
    )
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        company_name: body.company_name?.trim() || null,
        customer_representative: body.customer_representative?.trim() || null,
        email,
        phone: body.phone?.trim() || null,
        remark: body.remark?.trim() || null,
        password,
      },
      select: {
        customer_id: true,
        company_name: true,
        customer_representative: true,
        email: true,
        phone: true,
        remark: true,
      },
    })

    return NextResponse.json({ ok: true, customer }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Could not create customer." },
      { status: 409 }
    )
  }
}
