import assert from "node:assert/strict"
import test from "node:test"

import {
  EmsDisplayNameNotFoundError,
  EmsDisplayNameValidationError,
  updateCustomerEmsDisplayName,
  type EmsUnitDisplayNameRepository,
} from "@/lib/ems/display-name-service"

function createRepo(seed: Array<{ id: bigint; unit_id: string; customer_id: number | null; display_name: string | null }>): EmsUnitDisplayNameRepository {
  const units = new Map(seed.map((row) => [row.id.toString(), row]))

  return {
    async findFirst({ where, select }) {
      if (!where) {
        return null
      }

      const match = Array.from(units.values()).find(
        (row) => row.unit_id === where.unit_id && row.customer_id === where.customer_id
      )

      if (!match) {
        return null
      }

      return {
        id: match.id,
        unit_id: select?.unit_id ? match.unit_id : undefined,
        display_name: select?.display_name ? match.display_name : undefined,
      }
    },
    async update({ where, data, select }) {
      const target = Array.from(units.values()).find((row) => row.id === where.id)
      assert.ok(target, "expected update target to exist")

      const nextDisplayName =
        typeof data.display_name === "object" && data.display_name !== null
          ? (data.display_name.set ?? null)
          : (data.display_name ?? null)

      target.display_name = nextDisplayName

      return {
        unit_id: select?.unit_id ? target.unit_id : undefined,
        display_name: select?.display_name ? target.display_name : undefined,
      }
    },
  }
}

test("updateCustomerEmsDisplayName stores trimmed display name for owned unit", async () => {
  const repo = createRepo([
    {
      id: BigInt(1),
      unit_id: "862360079818095",
      customer_id: 10,
      display_name: null,
    },
  ])

  const result = await updateCustomerEmsDisplayName(
    {
      customerId: 10,
      unitId: "862360079818095",
      displayName: "  Main Plant LT Panel  ",
    },
    repo
  )

  assert.equal(result.unitId, "862360079818095")
  assert.equal(result.displayName, "Main Plant LT Panel")
})

test("updateCustomerEmsDisplayName clears display name when input is empty", async () => {
  const repo = createRepo([
    {
      id: BigInt(2),
      unit_id: "862360079818096",
      customer_id: 11,
      display_name: "Old name",
    },
  ])

  const result = await updateCustomerEmsDisplayName(
    {
      customerId: 11,
      unitId: "862360079818096",
      displayName: "   ",
    },
    repo
  )

  assert.equal(result.displayName, null)
})

test("updateCustomerEmsDisplayName rejects labels longer than 120 chars", async () => {
  const repo = createRepo([
    {
      id: BigInt(3),
      unit_id: "862360079818097",
      customer_id: 12,
      display_name: null,
    },
  ])

  const tooLong = "A".repeat(121)

  await assert.rejects(
    () =>
      updateCustomerEmsDisplayName(
        {
          customerId: 12,
          unitId: "862360079818097",
          displayName: tooLong,
        },
        repo
      ),
    (error: unknown) => {
      assert.ok(error instanceof EmsDisplayNameValidationError)
      return true
    }
  )
})

test("updateCustomerEmsDisplayName throws not found for non-owned unit", async () => {
  const repo = createRepo([
    {
      id: BigInt(4),
      unit_id: "862360079818098",
      customer_id: 20,
      display_name: null,
    },
  ])

  await assert.rejects(
    () =>
      updateCustomerEmsDisplayName(
        {
          customerId: 21,
          unitId: "862360079818098",
          displayName: "Customer 21 Name",
        },
        repo
      ),
    (error: unknown) => {
      assert.ok(error instanceof EmsDisplayNameNotFoundError)
      return true
    }
  )
})
