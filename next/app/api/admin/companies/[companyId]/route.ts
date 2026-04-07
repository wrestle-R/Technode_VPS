import { NextResponse } from "next/server"

import { hasAdminSession } from "@/lib/admin-auth"
import {
  getCompanyAssetFilename,
  getCompanyAssetRelativePath,
  getCompanyAssetUrl,
  renameCompanyAssets,
  saveCompanyAsset,
} from "@/lib/company-assets"
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { companyId } = await params
  const id = Number(companyId)

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid company ID." }, { status: 400 })
  }

  try {
    const existing = await prisma.company.findUnique({
      where: { company_id: id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 })
    }

    const formData = await request.formData()
    const name = getStringField(formData.get("name"))
    const slug = getStringField(formData.get("slug")).toLowerCase()
    const loginImage = getFileField(formData.get("loginImage"))
    const sidebarImage = getFileField(formData.get("sidebarImage"))
    const browserIcon = getFileField(formData.get("browserIcon"))
    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required." }, { status: 400 })
    }

    await renameCompanyAssets(existing.slug, slug)

    const loginImagePath = loginImage
      ? await saveCompanyAsset({ slug, file: loginImage, kind: "loginImage" })
      : getCompanyAssetRelativePath(
          slug,
          existing.login_image_path.split("/").pop() ?? getCompanyAssetFilename("loginImage", ".png")
        )

    const sidebarImagePath = sidebarImage
      ? await saveCompanyAsset({ slug, file: sidebarImage, kind: "sidebarImage" })
      : getCompanyAssetRelativePath(
          slug,
          existing.sidebar_image_path.split("/").pop() ?? getCompanyAssetFilename("sidebarImage", ".png")
        )

    const browserIconPath = browserIcon
      ? await saveCompanyAsset({ slug, file: browserIcon, kind: "browserIcon" })
      : getCompanyAssetRelativePath(
          slug,
          existing.browser_icon_path.split("/").pop() ?? getCompanyAssetFilename("browserIcon", ".ico")
        )

    const company = await prisma.company.update({
      where: { company_id: id },
      data: {
        name,
        slug,
        login_image_path: loginImagePath,
        sidebar_image_path: sidebarImagePath,
        browser_icon_path: browserIconPath,
      },
    })

    return NextResponse.json({ ok: true, company: serializeCompany(company) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update company."
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
