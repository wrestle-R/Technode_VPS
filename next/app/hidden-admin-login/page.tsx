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

    if (!username || !password) {
      const message = "Username and password are required."
      setError(message)
      toast.error(message)
      return
    }

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

      toast.success("Admin sign-in successful")
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
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.28),_transparent_26%),linear-gradient(180deg,_#0f172a_0%,_#172554_55%,_#111827_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/65 p-7 text-white shadow-[0_35px_90px_-45px_rgba(0,0,0,0.8)] backdrop-blur sm:p-9">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500" />
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Technode"
            width={180}
            height={44}
            className="mx-auto mb-4 h-11 w-auto brightness-[1.15]"
            priority
          />
          <p className="text-xs font-semibold tracking-[0.22em] text-sky-200">ADMIN ACCESS</p>
          <h1 className="mt-2 text-3xl font-semibold">Restricted Login</h1>
          <p className="mt-2 text-sm text-slate-300">Internal use only</p>
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
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
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
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
              placeholder="Enter admin password"
              required
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <Button type="submit" className="h-12 w-full rounded-2xl bg-linear-to-r from-sky-500 via-blue-500 to-indigo-500 text-sm font-semibold text-white shadow-[0_22px_34px_-20px_rgba(59,130,246,0.8)]" disabled={loading}>
            {loading ? "Signing in..." : "Continue To Admin"}
          </Button>
        </form>
      </section>
    </main>
  )
}
