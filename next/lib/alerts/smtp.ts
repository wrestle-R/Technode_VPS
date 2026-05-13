import nodemailer from "nodemailer"

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

let cachedConfig: SmtpConfig | null = null
let cachedTransporter: nodemailer.Transporter | null = null

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === "true") return true
  if (normalized === "false") return false
  return fallback
}

export function getSmtpConfig() {
  if (cachedConfig) {
    return cachedConfig
  }

  const host = process.env.ALERT_SMTP_HOST?.trim() ?? ""
  const portRaw = process.env.ALERT_SMTP_PORT?.trim() ?? ""
  const user = process.env.ALERT_SMTP_USER?.trim() ?? ""
  const pass = process.env.ALERT_SMTP_PASS ?? ""
  const from = process.env.ALERT_SMTP_FROM?.trim() || user
  const port = Number.parseInt(portRaw, 10)
  const secure = parseBoolean(process.env.ALERT_SMTP_SECURE, port === 465)

  const missing: string[] = []
  if (!host) missing.push("ALERT_SMTP_HOST")
  if (!portRaw || Number.isNaN(port)) missing.push("ALERT_SMTP_PORT")
  if (!user) missing.push("ALERT_SMTP_USER")
  if (!pass) missing.push("ALERT_SMTP_PASS")
  if (!from) missing.push("ALERT_SMTP_FROM")

  if (missing.length > 0) {
    throw new Error(`SMTP config missing: ${missing.join(", ")}`)
  }

  cachedConfig = {
    host,
    port,
    secure,
    user,
    pass,
    from,
  }

  return cachedConfig
}

export function getSmtpTransporter() {
  if (cachedTransporter) {
    return cachedTransporter
  }

  const config = getSmtpConfig()

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  return cachedTransporter
}

export async function verifySmtpConnection() {
  const transporter = getSmtpTransporter()
  await transporter.verify()
}

export async function sendSmtpMail({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  text: string
  html?: string
}) {
  const transporter = getSmtpTransporter()
  const config = getSmtpConfig()

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  })
}
