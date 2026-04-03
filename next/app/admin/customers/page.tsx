import { prisma } from "@/lib/prisma"
import { CustomersTable } from "./customers-table"

export const dynamic = "force-dynamic"

export default async function AdminCustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { customer_id: "asc" },
    select: {
      customer_id: true,
      company_name: true,
      customer_representative: true,
      email: true,
      phone: true,
      password: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">Customers from Technode VPS database.</p>
      </div>

      <CustomersTable customers={customers} />
    </div>
  )
}
