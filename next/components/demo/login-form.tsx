"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function LoginForm({
  company,
}: {
  company: {
    name: string
    logoUrl: string
  }
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoSrc, setLogoSrc] = useState(company.logoUrl || "/logo.png")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("Email and password are required.")
      toast.error("Email and password are required.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/customer-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        const message = data.error ?? "Login failed."
        setError(message)
        toast.error(message)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      const message = "Unable to connect to login server."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-secondary blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-7 shadow-lg sm:p-9">
        <div className="mb-8 text-center">
          <img
            src={logoSrc}
            alt={`${company.name} logo`}
            className="mx-auto mb-4 h-12 w-auto max-w-[200px] object-contain"
            onError={() => setLogoSrc("/logo.png")}
          />
          <p className="text-xs font-semibold tracking-[0.18em] text-primary/80">{company.name.toUpperCase()}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your {company.name} customer account</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="you@technode.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Enter password"
              required
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold" disabled={loading}>
            {loading ? "Signing in..." : "Continue To Customer Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  )
}
