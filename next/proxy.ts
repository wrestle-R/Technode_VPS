import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { ADMIN_SESSION_COOKIE, CUSTOMER_SESSION_COOKIE } from "@/lib/session-cookies"
import { getCompanySlugFromHostname } from "@/lib/tenancy"

const customerProtectedPrefixes = ["/dashboard", "/devices", "/ems", "/profile"]
const adminLoginPath = "/hidden-admin-login"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const companySlug = getCompanySlugFromHostname(request.nextUrl.hostname)
  const customerSession = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if ((pathname.startsWith("/admin") || pathname === adminLoginPath) && companySlug) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (pathname.startsWith("/admin") && adminSession !== "1") {
    return NextResponse.redirect(new URL(adminLoginPath, request.url))
  }

  if (pathname === adminLoginPath && adminSession === "1") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url))
  }

  if (customerProtectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
    if (!customerSession) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/devices/:path*", "/ems/:path*", "/profile/:path*", "/hidden-admin-login"],
}
