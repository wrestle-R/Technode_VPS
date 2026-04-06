import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

function hasEmsDelegates(client: PrismaClient | undefined) {
  if (!client) {
    return false
  }

  const prismaWithDelegates = client as PrismaClient & {
    emsUnit?: unknown
    emsLog?: unknown
  }

  return typeof prismaWithDelegates.emsUnit === "object" && typeof prismaWithDelegates.emsLog === "object"
}

const cachedPrisma = hasEmsDelegates(globalForPrisma.prisma) ? globalForPrisma.prisma : undefined

export const prisma = cachedPrisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
