import { CompanyForm } from "../company-form"

export default function AdminCompanyCreatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Company</h1>
        <p className="text-sm text-muted-foreground">Create a company tenant with required branding assets and a unique slug.</p>
      </div>

      <CompanyForm mode="create" />
    </div>
  )
}
