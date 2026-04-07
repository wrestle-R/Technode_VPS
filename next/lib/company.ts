import { headers } from "next/headers"

import { prisma } from "@/lib/prisma"
import { getCompanyAssetUrl } from "@/lib/company-assets"
import { buildCompanyLoginUrl, getCompanySlugFromHostname, getRequestHostname } from "@/lib/tenancy"

export type CompanyBranding = {
  companyId: number
  name: string
  slug: string
  logoPath: string
  iconPath: string
  logoUrl: string
  iconUrl: string
  loginUrl: string
}

function mapCompanyBranding(company: {
  company_id: number
  name: string
  slug: string
  logo_path: string
  icon_path: string
}) {
  return {
    companyId: company.company_id,
    name: company.name,
    slug: company.slug,
    logoPath: company.logo_path,
    iconPath: company.icon_path,
    logoUrl: getCompanyAssetUrl(company.logo_path),
    iconUrl: getCompanyAssetUrl(company.icon_path),
    loginUrl: buildCompanyLoginUrl(company.slug),
  } satisfies CompanyBranding
}

export async function getCompanyBySlug(slug: string) {
  const company = await prisma.company.findUnique({
    where: { slug },
    select: {
      company_id: true,
      name: true,
      slug: true,
      logo_path: true,
      icon_path: true,
    },
  })

  return company ? mapCompanyBranding(company) : null
}

export async function getCompanyById(companyId: number) {
  const company = await prisma.company.findUnique({
    where: { company_id: companyId },
    select: {
      company_id: true,
      name: true,
      slug: true,
      logo_path: true,
      icon_path: true,
    },
  })

  return company ? mapCompanyBranding(company) : null
}

export async function resolveRequestCompany() {
  const headerStore = await headers()
  const hostname = getRequestHostname(headerStore)
  const slug = getCompanySlugFromHostname(hostname)

  if (!slug) {
    return null
  }

  return getCompanyBySlug(slug)
}
