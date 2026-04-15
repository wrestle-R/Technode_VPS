export const CUSTOMER_SESSION_COOKIE = "technode_customer_session"
export const ADMIN_SESSION_COOKIE = "technode_admin_session"

export function shouldUseSecureCookies(request?: Request) {
  const explicit = process.env.COOKIE_SECURE?.trim().toLowerCase()
  if (explicit === "true") {
    return true
  }
  if (explicit === "false") {
    return false
  }

  const requestUrl = request?.url
  if (requestUrl) {
    return requestUrl.startsWith("https://")
  }

  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (publicUrl) {
    return publicUrl.startsWith("https://")
  }

  return false
}
