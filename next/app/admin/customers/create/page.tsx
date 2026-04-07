import { prisma } from "@/lib/prisma"
import { CustomerCreateForm } from "./customer-create-form"

export default async function AdminCustomerCreatePage() {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: {
      company_id: true,
      name: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">New Customer</p>
        <h1 className="mt-2 text-3xl font-semibold">Create Customer</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create a customer inside a mandatory company tenant.</p>
      </div>

      <CustomerCreateForm companies={companies} />
    </div>
  )
}
