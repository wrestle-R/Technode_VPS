import { NextResponse } from "next/server"

import { readUploadFile } from "@/lib/company-assets"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params

  try {
    const file = await readUploadFile(path)
    return new NextResponse(file.buffer, {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Upload not found." }, { status: 404 })
  }
}
