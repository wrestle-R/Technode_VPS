import { NextResponse } from "next/server"

import { sendTestAlertEmail } from "@/lib/alerts/engine"
import { getSmtpConfig, verifySmtpConnection } from "@/lib/alerts/smtp"
import { getCustomerSessionFromCookies } from "@/lib/auth"

export async function POST() {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    getSmtpConfig()
    await verifySmtpConnection()
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "SMTP configuration validation failed",
      },
      { status: 400 }
    )
  }

  try {
    const results = await sendTestAlertEmail(session.customerId)
    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to send test email",
      },
      { status: 400 }
    )
  }
}
