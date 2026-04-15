import { NextResponse } from "next/server"

import { corsPreflight, withCors } from "@/lib/cors"
import { ADMIN_SESSION_COOKIE, shouldUseSecureCookies } from "@/lib/session-cookies"

type AdminLoginBody = {
  username?: string
  password?: string
}

export async function OPTIONS(request: Request) {
  return corsPreflight(request)
}

export async function POST(request: Request) {
  const body = (await request.json()) as AdminLoginBody
  const username = body.username?.trim()
  const password = body.password ?? ""

  const adminUsername = process.env.ADMIN_USERNAME
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminUsername || !adminPassword) {
    return withCors(request, NextResponse.json(
      { error: "Admin credentials are not configured in environment variables." },
      { status: 500 }
    ))
  }

  if (username !== adminUsername || password !== adminPassword) {
    return withCors(request, NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 }))
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_SESSION_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 60 * 60 * 12,
  })

  return withCors(request, response)
}
