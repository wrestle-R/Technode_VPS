import Link from "next/link"

import { getCompanyAssetUrl } from "@/lib/company-assets"
import { prisma } from "@/lib/prisma"
import { buildCompanyLoginUrl } from "@/lib/tenancy"
import { CompaniesTable } from "./companies-table"

export const dynamic = "force-dynamic"

export default async function AdminCompaniesPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground">Manage company tenants, branding assets, and company login URLs.</p>
        </div>
        <Link
          href="/admin/companies/create"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          Create Company
        </Link>
      </div>

      <CompaniesTable
        companies={companies.map((company) => ({
          company_id: company.company_id,
          name: company.name,
          slug: company.slug,
          logo_url: getCompanyAssetUrl(company.logo_path),
          login_url: buildCompanyLoginUrl(company.slug),
          customer_count: company._count.customers,
        }))}
      />
    </div>
  )
}
