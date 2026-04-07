import { NextResponse } from "next/server"

import { hasAdminSession } from "@/lib/admin-auth"
import { getCompanyAssetUrl, saveCompanyAsset } from "@/lib/company-assets"
import { prisma } from "@/lib/prisma"
import { buildCompanyLoginUrl } from "@/lib/tenancy"

function parseWhiteLabelSettings(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw.trim()) {
    return {}
  }

  return JSON.parse(raw)
}

function getStringField(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

function getFileField(value: FormDataEntryValue | null) {
  return value instanceof File ? value : null
}

function serializeCompany(company: {
  company_id: number
  name: string
  slug: string
  logo_path: string
  icon_path: string
  white_label_settings: unknown
}) {
  return {
    company_id: company.company_id,
    name: company.name,
    slug: company.slug,
    logo_path: company.logo_path,
    icon_path: company.icon_path,
    logo_url: getCompanyAssetUrl(company.logo_path),
    icon_url: getCompanyAssetUrl(company.icon_path),
    login_url: buildCompanyLoginUrl(company.slug),
    white_label_settings: company.white_label_settings,
  }
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          customers: true,
        },
      },
    },
  })

  return NextResponse.json({
    companies: companies.map((company) => ({
      ...serializeCompany(company),
      customer_count: company._count.customers,
    })),
  })
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const name = getStringField(formData.get("name"))
    const slug = getStringField(formData.get("slug")).toLowerCase()
    const logo = getFileField(formData.get("logo"))
    const icon = getFileField(formData.get("icon"))
    const whiteLabelSettings = parseWhiteLabelSettings(formData.get("white_label_settings"))

    if (!name || !slug || !logo || !icon) {
      return NextResponse.json(
        { error: "name, slug, logo, and icon are required." },
        { status: 400 }
      )
    }

    const [logoPath, iconPath] = await Promise.all([
      saveCompanyAsset({ slug, file: logo, kind: "logo" }),
      saveCompanyAsset({ slug, file: icon, kind: "icon" }),
    ])

    const company = await prisma.company.create({
      data: {
        name,
        slug,
        logo_path: logoPath,
        icon_path: iconPath,
        white_label_settings: whiteLabelSettings,
      },
    })

    return NextResponse.json({ ok: true, company: serializeCompany(company) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create company."
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
