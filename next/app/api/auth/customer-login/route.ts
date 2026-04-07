import { NextResponse } from "next/server"

import { resolveRequestCompany } from "@/lib/company"
import { createCustomerSessionValue } from "@/lib/auth"
import { corsPreflight, withCors } from "@/lib/cors"
import { prisma } from "@/lib/prisma"
import { CUSTOMER_SESSION_COOKIE } from "@/lib/session-cookies"

type LoginBody = {
  email?: string
  password?: string
}

export async function OPTIONS(request: Request) {
  return corsPreflight(request)
}

export async function POST(request: Request) {
  const company = await resolveRequestCompany()
  if (!company) {
    return withCors(request, NextResponse.json({ error: "Unknown company login URL." }, { status: 404 }))
  }

  const body = (await request.json()) as LoginBody
  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ""

  if (!email || !password) {
    return withCors(request, NextResponse.json({ error: "Email and password are required." }, { status: 400 }))
  }

  const customer = await prisma.customer.findFirst({
    where: {
      company_id: company.companyId,
      email,
    },
  })

  if (!customer?.password) {
    return withCors(request, NextResponse.json({ error: "Invalid email or password." }, { status: 401 }))
  }

  if (customer.password !== password) {
    return withCors(request, NextResponse.json({ error: "Invalid email or password." }, { status: 401 }))
  }

  const response = NextResponse.json({
    ok: true,
    customer: {
      customerId: customer.customer_id,
      companyId: company.companyId,
      companySlug: company.slug,
      companyName: company.name,
      companyLogoUrl: company.logoUrl,
      companyIconUrl: company.iconUrl,
      email: customer.email,
      customerRepresentative: customer.customer_representative,
    },
  })

  response.cookies.set(CUSTOMER_SESSION_COOKIE, createCustomerSessionValue({
    customerId: customer.customer_id,
    companyId: company.companyId,
    companySlug: company.slug,
    companyName: company.name,
    companyLogoUrl: company.logoUrl,
    companyIconUrl: company.iconUrl,
    email: customer.email ?? "",
    customerRepresentative: customer.customer_representative ?? "Customer",
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  })

  return withCors(request, response)
}
