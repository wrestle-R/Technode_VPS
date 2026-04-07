"use client"

import Link from "next/link"
import { Fragment } from "react"

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
            <th className="px-4 py-3 text-left font-medium">Company</th>
            <th className="px-4 py-3 text-left font-medium">Slug</th>
            <th className="px-4 py-3 text-left font-medium">Customers</th>
            <th className="px-4 py-3 text-left font-medium">Login URL</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {companies.map((company) => (
            <Fragment key={company.company_id}>
              <tr className="align-top">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium leading-tight">{company.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">ID: #{company.company_id}</p>
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
              <tr className="bg-muted/20">
                <td colSpan={5} className="px-4 pb-4 pt-0">
                  <details className="group rounded-md border border-border/70 bg-background/70 px-3 py-2">
                    <summary className="cursor-pointer list-none text-xs font-medium text-primary">
                      Customer details ({company.customers.length})
                    </summary>
                    <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
                      {company.customers.length > 0 ? (
                        company.customers.map((customer) => (
                          <div key={customer.customer_id} className="leading-tight">
                            <p className="font-medium text-foreground/90">
                              {customer.customer_representative?.trim() || `Customer #${customer.customer_id}`}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{customer.email}</p>
                            {customer.phone ? <p className="mt-0.5 text-xs text-muted-foreground">{customer.phone}</p> : null}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No customers assigned.</p>
                      )}
                    </div>
                  </details>
                </td>
              </tr>
            </Fragment>
          ))}
          {companies.length === 0 ? (
            <tr>
              <td className="px-4 py-5 text-muted-foreground" colSpan={5}>
                No companies found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
