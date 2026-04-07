import { NextResponse } from "next/server"

import { hasAdminSession } from "@/lib/admin-auth"
import { getCompanyAssetUrl, saveCompanyAsset } from "@/lib/company-assets"
import { prisma } from "@/lib/prisma"
import { buildCompanyLoginUrl } from "@/lib/tenancy"

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
  login_image_path: string
  sidebar_image_path: string
  browser_icon_path: string
}) {
  return {
    company_id: company.company_id,
    name: company.name,
    slug: company.slug,
    login_image_path: company.login_image_path,
    sidebar_image_path: company.sidebar_image_path,
    browser_icon_path: company.browser_icon_path,
    login_image_url: getCompanyAssetUrl(company.login_image_path),
    sidebar_image_url: getCompanyAssetUrl(company.sidebar_image_path),
    browser_icon_url: getCompanyAssetUrl(company.browser_icon_path),
    login_url: buildCompanyLoginUrl(company.slug),
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
    const loginImage = getFileField(formData.get("loginImage"))
    const sidebarImage = getFileField(formData.get("sidebarImage"))
    const browserIcon = getFileField(formData.get("browserIcon"))
    if (!name || !slug || !loginImage || !sidebarImage || !browserIcon) {
      return NextResponse.json(
        { error: "name, slug, loginImage, sidebarImage, and browserIcon are required." },
        { status: 400 }
      )
    }

    const [loginImagePath, sidebarImagePath, browserIconPath] = await Promise.all([
      saveCompanyAsset({ slug, file: loginImage, kind: "loginImage" }),
      saveCompanyAsset({ slug, file: sidebarImage, kind: "sidebarImage" }),
      saveCompanyAsset({ slug, file: browserIcon, kind: "browserIcon" }),
    ])

    const company = await prisma.company.create({
      data: {
        name,
        slug,
        login_image_path: loginImagePath,
        sidebar_image_path: sidebarImagePath,
        browser_icon_path: browserIconPath,
      },
    })

    return NextResponse.json({ ok: true, company: serializeCompany(company) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create company."
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
