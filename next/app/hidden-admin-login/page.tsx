"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export default function HiddenAdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    setLoading(true)
    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        const message = data.error ?? "Admin login failed."
        setError(message)
        toast.error(message)
        return
      }

      router.push("/admin/dashboard")
      router.refresh()
    } catch {
      const message = "Unable to connect to admin login."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-secondary blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-7 shadow-lg sm:p-9">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Technode"
            width={180}
            height={44}
            className="mx-auto mb-4 h-11 w-auto"
            priority
          />
          <p className="text-xs font-semibold tracking-[0.14em] text-primary">ADMIN ACCESS</p>
          <h1 className="mt-2 text-2xl font-semibold">Restricted Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Internal use only</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Admin username"
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
              placeholder="Enter admin password"
              required
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold" disabled={loading}>
            {loading ? "Signing in..." : "Continue To Admin"}
          </Button>
        </form>
      </section>
    </main>
  )
}
