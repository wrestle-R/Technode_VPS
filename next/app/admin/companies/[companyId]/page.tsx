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
        <h1 className="text-2xl font-semibold">Edit Company</h1>
        <p className="text-sm text-muted-foreground">Update slug, branding uploads, and white-label settings.</p>
      </div>

      <CompanyForm
        mode="edit"
        initialValues={{
          company_id: company.company_id,
          name: company.name,
          slug: company.slug,
          logo_url: getCompanyAssetUrl(company.logo_path),
          icon_url: getCompanyAssetUrl(company.icon_path),
        }}
      />
    </div>
  )
}
