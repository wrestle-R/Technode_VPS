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
      customers: {
        orderBy: [{ customer_representative: "asc" }, { email: "asc" }],
        select: {
          customer_id: true,
          customer_representative: true,
          email: true,
          phone: true,
        },
      },
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
          <p className="text-sm text-muted-foreground">
            Review tenants, open company login URLs, and manage company-linked customer accounts.
          </p>
        </div>
        <Link
          href="/admin/companies/create"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          Create Company
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total Companies</p>
          <p className="mt-1.5 text-xl font-semibold">{companies.length}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total Customers</p>
          <p className="mt-1.5 text-xl font-semibold">
            {companies.reduce((sum, company) => sum + company._count.customers, 0)}
          </p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tenant Domains</p>
          <p className="mt-1.5 text-sm text-muted-foreground">Uses slug.localhost:3000 locally and subdomains in production.</p>
        </div>
      </div>

      <CompaniesTable
        companies={companies.map((company) => ({
          company_id: company.company_id,
          name: company.name,
          slug: company.slug,
          logo_url: getCompanyAssetUrl(company.logo_path),
          login_url: buildCompanyLoginUrl(company.slug),
          customer_count: company._count.customers,
          customers: company.customers,
        }))}
      />
    </div>
  )
}
