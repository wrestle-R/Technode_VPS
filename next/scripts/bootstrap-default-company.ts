import { PrismaClient } from "@prisma/client"

import { seedDefaultCompanyAssets } from "../lib/company-assets"

const prisma = new PrismaClient()

const DEFAULT_CUSTOMER_PASSWORD = process.env.DEFAULT_TECHNODE_CUSTOMER_PASSWORD ?? "russ123"

async function main() {
  await seedDefaultCompanyAssets()

  const company = await prisma.company.upsert({
    where: { slug: "technode" },
    update: {
      name: "Technode",
      logo_path: "companies/technode/logo.png",
      icon_path: "companies/technode/icon.png",
    },
    create: {
      name: "Technode",
      slug: "technode",
      logo_path: "companies/technode/logo.png",
      icon_path: "companies/technode/icon.png",
    },
  })

  await prisma.customer.upsert({
    where: {
      company_id_email: {
        company_id: company.company_id,
        email: "russ@gmail.com",
      },
    },
    update: {
      customer_representative: "Russel",
      password: DEFAULT_CUSTOMER_PASSWORD,
      remark: "Seeded default customer",
    },
    create: {
      company_id: company.company_id,
      customer_representative: "Russel",
      email: "russ@gmail.com",
      password: DEFAULT_CUSTOMER_PASSWORD,
      remark: "Seeded default customer",
    },
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
