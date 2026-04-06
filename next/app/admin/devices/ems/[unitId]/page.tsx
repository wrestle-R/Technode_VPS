import { notFound } from "next/navigation"

import { AdminEmsUnitEditor } from "@/components/admin/ems/unit-editor"
import { getAdminEmsUnit } from "@/lib/ems/queries"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function AdminEmsUnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>
}) {
  const { unitId } = await params
  const [unit, customers] = await Promise.all([
    getAdminEmsUnit(unitId),
    prisma.customer.findMany({
      orderBy: { customer_id: "asc" },
      select: {
        customer_id: true,
        company_name: true,
      },
    }),
  ])

  if (!unit) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{unit.unitId}</h1>
        <p className="text-sm text-muted-foreground">
          Assign the unit, edit coordinates, and control how each slave is mapped and displayed.
        </p>
      </div>

      <AdminEmsUnitEditor unit={unit} customers={customers} />
    </div>
  )
}
