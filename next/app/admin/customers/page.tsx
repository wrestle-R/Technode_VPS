import { prisma } from "@/lib/prisma"
import { CustomersTable } from "./customers-table"

export const dynamic = "force-dynamic"

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{ companyId?: string }>
}) {
  const resolved = searchParams ? await searchParams : {}
  const companyId = resolved.companyId ? Number(resolved.companyId) : undefined
  const customers = await prisma.customer.findMany({
    where: typeof companyId === "number" && !Number.isNaN(companyId) ? { company_id: companyId } : undefined,
    orderBy: [{ company: { name: "asc" } }, { customer_id: "asc" }],
    select: {
      customer_id: true,
      company_id: true,
      company: {
        select: {
          name: true,
          slug: true,
        },
      },
      customer_representative: true,
      email: true,
      phone: true,
      remark: true,
      password: true,
    },
  })
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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">Tenant Accounts</p>
        <h1 className="mt-2 text-3xl font-semibold">Customers</h1>
        <p className="mt-2 text-sm text-muted-foreground">Customers are shown in a clean editable table for faster admin updates.</p>
      </div>

      <CustomersTable customers={customers} companies={companies} />
    </div>
  )
}
