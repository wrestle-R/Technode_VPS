import { notFound } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { resolveRequestCompany } from "@/lib/company"

export async function generateMetadata() {
  const company = await resolveRequestCompany()

  return {
    title: company ? `${company.name} Login` : "Customer Login",
    icons: company ? { icon: company.browserIconUrl } : undefined,
  }
}

export default async function LoginPage() {
  const company = await resolveRequestCompany()
  if (!company) {
    notFound()
  }

  return <LoginForm company={{ loginImageUrl: company.loginImageUrl }} />
}
