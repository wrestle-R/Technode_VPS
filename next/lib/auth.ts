import { cookies } from "next/headers"

import { CUSTOMER_SESSION_COOKIE } from "@/lib/session-cookies"

export type CustomerSession = {
  customerId: number
  email: string
  customerRepresentative: string
}

export async function getCustomerSessionFromCookies() {
  const store = await cookies()
  const raw = store.get(CUSTOMER_SESSION_COOKIE)?.value

  if (!raw) {
    return null
  }

  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as CustomerSession
    if (!decoded?.email || typeof decoded.customerId !== "number") {
      return null
    }

    return decoded
  } catch {
    return null
  }
}

export function createCustomerSessionValue(session: CustomerSession) {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64url")
}
