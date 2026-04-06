import { cookies } from "next/headers"

import { ADMIN_SESSION_COOKIE } from "@/lib/session-cookies"

export async function hasAdminSession() {
  const store = await cookies()
  return store.get(ADMIN_SESSION_COOKIE)?.value === "1"
}
