import { CompanyForm } from "../company-form"

export default function AdminCompanyCreatePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">New Tenant</p>
        <h1 className="mt-2 text-3xl font-semibold">Create Company</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create a tenant with dedicated login image, sidebar image, browser icon, and a unique slug.</p>
      </div>

      <CompanyForm mode="create" />
    </div>
  )
}
