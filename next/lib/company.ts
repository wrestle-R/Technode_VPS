import { headers } from "next/headers"

import { prisma } from "@/lib/prisma"
import { getCompanyAssetUrl } from "@/lib/company-assets"
import { buildCompanyLoginUrl, getCompanySlugFromHostname, getRequestHostname } from "@/lib/tenancy"

export type CompanyBranding = {
  companyId: number
  name: string
  slug: string
  loginImagePath: string
  sidebarImagePath: string
  browserIconPath: string
  loginImageUrl: string
  sidebarImageUrl: string
  browserIconUrl: string
  loginUrl: string
}

function mapCompanyBranding(company: {
  company_id: number
  name: string
  slug: string
  login_image_path: string
  sidebar_image_path: string
  browser_icon_path: string
}) {
  return {
    companyId: company.company_id,
    name: company.name,
    slug: company.slug,
    loginImagePath: company.login_image_path,
    sidebarImagePath: company.sidebar_image_path,
    browserIconPath: company.browser_icon_path,
    loginImageUrl: getCompanyAssetUrl(company.login_image_path),
    sidebarImageUrl: getCompanyAssetUrl(company.sidebar_image_path),
    browserIconUrl: getCompanyAssetUrl(company.browser_icon_path),
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
      login_image_path: true,
      sidebar_image_path: true,
      browser_icon_path: true,
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
      login_image_path: true,
      sidebar_image_path: true,
      browser_icon_path: true,
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
