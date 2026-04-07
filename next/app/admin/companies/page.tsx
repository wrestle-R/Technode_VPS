import Link from "next/link"

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
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">Tenant Control</p>
          <h1 className="mt-2 text-3xl font-semibold">Companies</h1>
        </div>
        <Link
          href="/admin/companies/create"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-linear-to-r from-sky-600 via-blue-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-[0_20px_32px_-20px_rgba(37,99,235,0.85)] transition hover:opacity-95"
        >
          Create Company
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel-surface rounded-[28px] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total Companies</p>
          <p className="mt-1.5 text-xl font-semibold">{companies.length}</p>
        </div>
        <div className="panel-surface rounded-[28px] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total Customers</p>
          <p className="mt-1.5 text-xl font-semibold">
            {companies.reduce((sum, company) => sum + company._count.customers, 0)}
          </p>
        </div>
        <div className="panel-surface rounded-[28px] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tenant Domains</p>
          <p className="mt-1.5 text-sm text-muted-foreground">Technode works on the bare domain. Other companies use `slug.domain` in production and `slug.localhost` locally.</p>
        </div>
      </div>

      <CompaniesTable
        companies={companies.map((company) => ({
          company_id: company.company_id,
          name: company.name,
          slug: company.slug,
          login_image_url: `/uploads/${company.login_image_path}`,
          sidebar_image_url: `/uploads/${company.sidebar_image_path}`,
          browser_icon_url: `/uploads/${company.browser_icon_path}`,
          login_url: buildCompanyLoginUrl(company.slug),
          customer_count: company._count.customers,
          customers: company.customers,
        }))}
      />
    </div>
  )
}
