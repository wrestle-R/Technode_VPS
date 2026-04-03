import { NextResponse } from "next/server"

export function withCors(request: Request, response: NextResponse) {
  const origin = request.headers.get("origin") ?? "*"

  response.headers.set("Access-Control-Allow-Origin", origin)
  response.headers.set("Vary", "Origin")
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  response.headers.set("Access-Control-Max-Age", "86400")

  return response
}

export function corsPreflight(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }))
}
