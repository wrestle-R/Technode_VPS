"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function LoginForm({
  company,
}: {
  company: {
    loginImageUrl: string
  }
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [logoSrc, setLogoSrc] = useState(company.loginImageUrl || "/logo.png")

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

      toast.success("Signed in successfully")
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
    <div className="app-page-surface flex min-h-svh items-center justify-center px-4 py-10">
      <div className="app-card-surface w-full max-w-md rounded-2xl p-7 sm:p-9">
        <div className="mb-8 text-center">
          <Image
            src={logoSrc}
            alt="Company logo"
            width={220}
            height={56}
            unoptimized
            className="mx-auto mb-5 h-14 w-auto max-w-[220px] object-contain"
            onError={() => setLogoSrc("/logo.png")}
          />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use your customer account credentials</p>
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
              className="field-input h-12"
              placeholder="you@technode.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field-input h-12 w-full pr-10"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <Button
            type="submit"
            className="app-brand-button h-12 w-full rounded-2xl text-sm font-semibold"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Continue To Customer Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  )
}
