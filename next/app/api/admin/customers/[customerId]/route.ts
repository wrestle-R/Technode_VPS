import { NextResponse } from "next/server"

import { hasAdminSession } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

type UpdateCustomerBody = {
  company_id?: number
  customer_representative?: string
  email?: string
  phone?: string
  remark?: string
  password?: string
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { customerId } = await params
  const id = Number(customerId)

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid customer ID." }, { status: 400 })
  }

  const body = (await request.json()) as UpdateCustomerBody
  const email = body.email?.trim().toLowerCase() ?? ""
  const password = body.password ?? ""
  const companyId = Number(body.company_id)

  if (!email || !password || Number.isNaN(companyId)) {
    return NextResponse.json({ error: "company_id, email and password are required." }, { status: 400 })
  }

  try {
    const customer = await prisma.customer.update({
      where: { customer_id: id },
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
        password: true,
      },
    })

    return NextResponse.json({ ok: true, customer })
  } catch {
    return NextResponse.json({ error: "Could not update customer." }, { status: 409 })
  }
}
