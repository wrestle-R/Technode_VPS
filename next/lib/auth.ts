import { cookies, headers } from "next/headers"

import { CUSTOMER_SESSION_COOKIE } from "@/lib/session-cookies"
import { getCompanySlugFromHostname, getRequestHostname } from "@/lib/tenancy"

export type CustomerSession = {
  customerId: number
  companyId: number
  companySlug: string
  companyName: string
  companyLogoUrl: string
  companyIconUrl: string
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
    const headerStore = await headers()
    const requestSlug = getCompanySlugFromHostname(getRequestHostname(headerStore))
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as CustomerSession
    if (
      !decoded?.email ||
      typeof decoded.customerId !== "number" ||
      typeof decoded.companyId !== "number" ||
      !decoded.companySlug ||
      !decoded.companyLogoUrl ||
      !decoded.companyIconUrl
    ) {
      return null
    }

    if (requestSlug && decoded.companySlug !== requestSlug) {
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
