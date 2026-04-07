import Link from "next/link"

type CompanyRow = {
  company_id: number
  name: string
  slug: string
  logo_url: string
  login_url: string
  customer_count: number
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
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {companies.map((company) => (
            <tr key={company.company_id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img src={company.logo_url} alt={company.name} className="h-8 w-auto max-w-28 object-contain" />
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-xs text-muted-foreground">#{company.company_id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{company.slug}</td>
              <td className="px-4 py-3">{company.customer_count}</td>
              <td className="px-4 py-3">
                <a href={company.login_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                  {company.login_url}
                </a>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Link
                    href={`/admin/companies/${company.company_id}`}
                    className="inline-flex h-7 items-center rounded-md border border-input px-2.5 text-xs font-medium hover:bg-muted"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/admin/customers?companyId=${company.company_id}`}
                    className="inline-flex h-7 items-center rounded-md border border-input px-2.5 text-xs font-medium hover:bg-muted"
                  >
                    Customers
                  </Link>
                </div>
              </td>
            </tr>
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
