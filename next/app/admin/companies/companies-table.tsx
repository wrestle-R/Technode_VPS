"use client"

import Link from "next/link"
import { CustomersTable } from "../customers/customers-table"
import { ChevronDown } from "lucide-react"

type CompanyRow = {
  company_id: number
  name: string
  slug: string
  customer_count: number
  customers: {
    customer_id: number
    customer_representative: string | null
    email: string
    phone: string | null
  }[]
}

export function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  if (companies.length === 0) {
    return (
      <section className="panel-surface rounded-[30px] p-8 text-center">
        <p className="text-lg font-semibold">No companies found.</p>
        <p className="mt-2 text-sm text-muted-foreground">Create the first tenant to configure login, sidebar, and browser branding.</p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {companies.map((company) => (
        <details key={company.company_id} className="group panel-surface overflow-hidden rounded-[24px] open:pb-4">
          <summary className="flex cursor-pointer list-none items-center justify-between border-b border-transparent bg-white/70 px-6 py-5 transition-colors group-open:border-border/60 hover:bg-white/90">
            <h2 className="text-2xl font-semibold">{company.name}</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground bg-white/50 px-3 py-1 rounded-full border border-border/50">
                {company.customer_count} Customers
              </span>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-open:-rotate-180" />
            </div>
          </summary>

          <div className="animate-in slide-in-from-top-4 fade-in duration-300 px-6 py-5 space-y-6">
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/companies/${company.company_id}`} className="inline-flex h-9 items-center rounded-xl border border-border/70 bg-white/80 px-4 text-xs font-medium shadow-sm hover:bg-white transition-colors">
                Edit Branding
              </Link>
              <Link href={`/admin/customers?companyId=${company.company_id}`} className="inline-flex h-9 items-center rounded-xl border border-border/70 bg-white/80 px-4 text-xs font-medium shadow-sm hover:bg-white transition-colors">
                View Customers
              </Link>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border/70 bg-white/80 shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/45 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Tenant ID</th>
                    <th className="px-4 py-3">Tenant Slug</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/60 bg-white/40">
                    <td className="px-4 py-3 font-semibold text-primary">#{company.company_id}</td>
                    <td className="px-4 py-3 font-mono text-xs bg-muted/20">{company.slug}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <CustomersTable
                customers={company.customers.map((customer) => ({
                  customer_id: customer.customer_id,
                  company_id: company.company_id,
                  company: {
                    name: company.name,
                    slug: company.slug,
                  },
                  customer_representative: customer.customer_representative,
                  email: customer.email,
                  phone: customer.phone,
                  remark: null,
                  password: null,
                }))}
                companies={[
                  {
                    company_id: company.company_id,
                    name: company.name,
                  },
                ]}
              />
            </div>
          </div>
        </details>
      ))}
    </section>
  )
}
