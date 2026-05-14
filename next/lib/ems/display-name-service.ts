import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export class EmsDisplayNameValidationError extends Error {}

export class EmsDisplayNameNotFoundError extends Error {}

type UpdateDisplayNameResult = {
  unitId: string
  displayName: string | null
}

export type EmsUnitDisplayNameRepository = {
  findFirst: (args: Prisma.EmsUnitFindFirstArgs) => Promise<{
    id: bigint
    unit_id?: string
    display_name?: string | null
  } | null>
  update: (args: Prisma.EmsUnitUpdateArgs) => Promise<{
    unit_id?: string
    display_name?: string | null
  }>
}

const defaultRepo: EmsUnitDisplayNameRepository = {
  findFirst: (args) => prisma.emsUnit.findFirst(args),
  update: (args) => prisma.emsUnit.update(args),
}

export async function updateCustomerEmsDisplayName(
  {
    customerId,
    unitId,
    displayName,
  }: {
    customerId: number
    unitId: string
    displayName: string | null | undefined
  },
  repo: EmsUnitDisplayNameRepository = defaultRepo
): Promise<UpdateDisplayNameResult> {
  const normalizedDisplayName = displayName?.trim() ?? ""

  if (normalizedDisplayName.length > 120) {
    throw new EmsDisplayNameValidationError(
      "Display name must be 120 characters or fewer"
    )
  }

  const unit = await repo.findFirst({
    where: {
      unit_id: unitId,
      customer_id: customerId,
    },
    select: {
      id: true,
      unit_id: true,
      display_name: true,
    },
  })

  if (!unit) {
    throw new EmsDisplayNameNotFoundError("Unit not found")
  }

  const saved = await repo.update({
    where: { id: unit.id },
    data: {
      display_name: normalizedDisplayName || null,
    },
    select: {
      unit_id: true,
      display_name: true,
    },
  })

  return {
    unitId: saved.unit_id ?? unitId,
    displayName: saved.display_name ?? null,
  }
}
