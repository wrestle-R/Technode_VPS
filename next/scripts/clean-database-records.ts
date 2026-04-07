import { prisma } from "../lib/prisma"

async function main() {
  const shouldConfirm = process.argv.includes("--confirm")

  if (!shouldConfirm) {
    console.error("This command permanently removes all rows from public tables.")
    console.error("Run with --confirm to continue.")
    process.exit(1)
  }

  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `

  if (tables.length === 0) {
    console.log("No tables found to clean.")
    return
  }

  const tableList = tables.map((table) => `"public"."${table.tablename}"`).join(", ")
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`)

  console.log(`Clean complete. Removed all records from ${tables.length} table(s):`)
  for (const table of tables) {
    console.log(`- ${table.tablename}`)
  }
}

main()
  .catch((error) => {
    console.error("Database clean failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
