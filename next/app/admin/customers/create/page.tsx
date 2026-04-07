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
        <h1 className="text-2xl font-semibold">Create Customer</h1>
        <p className="text-sm text-muted-foreground">Create a customer inside a mandatory company tenant.</p>
      </div>

      <CustomerCreateForm companies={companies} />
    </div>
  )
}
