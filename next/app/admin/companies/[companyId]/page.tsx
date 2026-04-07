import { notFound } from "next/navigation"

import { getCompanyAssetUrl } from "@/lib/company-assets"
import { prisma } from "@/lib/prisma"
import { CompanyForm } from "../company-form"

export const dynamic = "force-dynamic"

export default async function AdminCompanyEditPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params
  const company = await prisma.company.findUnique({
    where: { company_id: Number(companyId) },
  })

  if (!company) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">Tenant Branding</p>
        <h1 className="mt-2 text-3xl font-semibold">Edit Company</h1>
        <p className="mt-2 text-sm text-muted-foreground">Update slug, login artwork, sidebar artwork, and browser icon for this tenant.</p>
      </div>

      <CompanyForm
        mode="edit"
        initialValues={{
          company_id: company.company_id,
          name: company.name,
          slug: company.slug,
          login_image_url: getCompanyAssetUrl(company.login_image_path),
          sidebar_image_url: getCompanyAssetUrl(company.sidebar_image_path),
          browser_icon_url: getCompanyAssetUrl(company.browser_icon_path),
        }}
      />
    </div>
  )
}
