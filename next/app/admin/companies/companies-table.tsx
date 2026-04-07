"use client"

import Link from "next/link"

type CompanyRow = {
  company_id: number
  name: string
  slug: string
  logo_url: string
  login_url: string
  customer_count: number
  customers: {
    customer_id: number
    customer_representative: string | null
    email: string
    phone: string | null
  }[]
}

export function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Brand</th>
            <th className="px-4 py-3 text-left font-medium">Slug</th>
            <th className="px-4 py-3 text-left font-medium">Customers</th>
            <th className="px-4 py-3 text-left font-medium">Login URL</th>
            <th className="px-4 py-3 text-left font-medium">Customer Accounts</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {companies.map((company) => (
            <tr key={company.company_id} className="align-top">
              <td className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="mt-0.5 h-8 w-auto max-w-28 object-contain"
                    onError={(event) => {
                      event.currentTarget.src = "/logo.png"
                    }}
                  />
                  <div>
                    <p className="font-medium leading-tight">{company.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">#{company.company_id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{company.slug}</td>
              <td className="px-4 py-3">{company.customer_count}</td>
              <td className="max-w-[260px] px-4 py-3">
                <a
                  href={company.login_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-primary underline-offset-4 hover:underline"
                  title={company.login_url}
                >
                  {company.login_url}
                </a>
              </td>
              <td className="px-4 py-3">
                {company.customers.length > 0 ? (
                  <div className="space-y-2">
                    {company.customers.slice(0, 2).map((customer) => (
                      <div key={customer.customer_id} className="leading-tight">
                        <p className="font-medium text-foreground/90">
                          {customer.customer_representative?.trim() || `Customer #${customer.customer_id}`}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{customer.email}</p>
                      </div>
                    ))}
                    {company.customers.length > 2 ? (
                      <p className="text-xs text-muted-foreground">+{company.customers.length - 2} more</p>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No customers</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/companies/${company.company_id}`}
                    className="inline-flex h-8 items-center rounded-md border border-input px-2.5 text-xs font-medium hover:bg-muted"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/admin/customers?companyId=${company.company_id}`}
                    className="inline-flex h-8 items-center rounded-md border border-input px-2.5 text-xs font-medium hover:bg-muted"
                  >
                    Customers
                  </Link>
                  <a
                    href={company.login_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                  >
                    Login
                  </a>
                </div>
              </td>
            </tr>
          ))}
          {companies.length === 0 ? (
            <tr>
              <td className="px-4 py-5 text-muted-foreground" colSpan={6}>
                No companies found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
