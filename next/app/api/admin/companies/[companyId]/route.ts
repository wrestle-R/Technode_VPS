import { NextResponse } from "next/server"

import { hasAdminSession } from "@/lib/admin-auth"
import {
  getCompanyAssetRelativePath,
  getCompanyAssetUrl,
  renameCompanyAssets,
  saveCompanyAsset,
} from "@/lib/company-assets"
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
    const logo = getFileField(formData.get("logo"))
    const icon = getFileField(formData.get("icon"))
    const whiteLabelSettings = parseWhiteLabelSettings(formData.get("white_label_settings"))

    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required." }, { status: 400 })
    }

    await renameCompanyAssets(existing.slug, slug)

    const logoPath = logo
      ? await saveCompanyAsset({ slug, file: logo, kind: "logo" })
      : getCompanyAssetRelativePath(slug, existing.logo_path.split("/").pop() ?? "logo.png")

    const iconPath = icon
      ? await saveCompanyAsset({ slug, file: icon, kind: "icon" })
      : getCompanyAssetRelativePath(slug, existing.icon_path.split("/").pop() ?? "icon.png")

    const company = await prisma.company.update({
      where: { company_id: id },
      data: {
        name,
        slug,
        logo_path: logoPath,
        icon_path: iconPath,
        white_label_settings: whiteLabelSettings,
      },
    })

    return NextResponse.json({ ok: true, company: serializeCompany(company) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update company."
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
