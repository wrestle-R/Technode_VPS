import { NextResponse } from "next/server"

import { hasAdminSession } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

type CreateCustomerBody = {
  company_id?: number
  customer_representative?: string
  email?: string
  phone?: string
  remark?: string
  password?: string
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const customers = await prisma.customer.findMany({
    orderBy: { customer_id: "asc" },
    select: {
      customer_id: true,
      company_id: true,
      company: {
        select: {
          name: true,
          slug: true,
        },
      },
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
  const companyId = Number(body.company_id)

  if (!email || !password || Number.isNaN(companyId)) {
    return NextResponse.json(
      { error: "company_id, email and password are required." },
      { status: 400 }
    )
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        company_id: companyId,
        customer_representative: body.customer_representative?.trim() || null,
        email,
        phone: body.phone?.trim() || null,
        remark: body.remark?.trim() || null,
        password,
      },
      select: {
        customer_id: true,
        company_id: true,
        company: {
          select: {
            name: true,
            slug: true,
          },
        },
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
