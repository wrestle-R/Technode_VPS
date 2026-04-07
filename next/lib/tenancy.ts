const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"])

function stripPort(host: string) {
  return host.split(":")[0]?.toLowerCase() ?? ""
}

function isLocalHostname(hostname: string) {
  return LOCAL_HOSTS.has(hostname)
}

function getBaseAppUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  } catch {
    return new URL("http://localhost:3000")
  }
}

export function getBaseHostname() {
  return stripPort(getBaseAppUrl().host)
}

export function getRequestHost(headersObject: Headers) {
  return headersObject.get("x-forwarded-host") ?? headersObject.get("host")
}

export function getRequestHostname(headersObject: Headers) {
  const host = getRequestHost(headersObject)
  return host ? stripPort(host) : null
}

export function getCompanySlugFromHostname(hostname: string | null) {
  if (!hostname) {
    return null
  }

  if (isLocalHostname(hostname)) {
    return null
  }

  if (hostname.endsWith(".localhost")) {
    const slug = hostname.slice(0, -".localhost".length)
    return slug || null
  }

  const baseHostname = getBaseHostname()
  if (hostname === baseHostname || isLocalHostname(baseHostname)) {
    return null
  }

  if (!hostname.endsWith(`.${baseHostname}`)) {
    return null
  }

  const prefix = hostname.slice(0, -(baseHostname.length + 1))
  if (!prefix || prefix.includes(".")) {
    return null
  }

  return prefix
}

export function buildCompanyLoginUrl(slug: string) {
  const baseUrl = getBaseAppUrl()

  if (isLocalHostname(baseUrl.hostname)) {
    const host = `${slug}.localhost${baseUrl.port ? `:${baseUrl.port}` : ""}`
    return `${baseUrl.protocol}//${host}/login`
  }

  return `${baseUrl.protocol}//${slug}.${baseUrl.host}/login`
}
