import { NextResponse } from "next/server"

import { corsPreflight, withCors } from "@/lib/cors"
import { ADMIN_SESSION_COOKIE, CUSTOMER_SESSION_COOKIE, shouldUseSecureCookies } from "@/lib/session-cookies"

export async function OPTIONS(request: Request) {
  return corsPreflight(request)
}

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true })

  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 0,
  })

  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 0,
  })

  return withCors(request, response)
}
