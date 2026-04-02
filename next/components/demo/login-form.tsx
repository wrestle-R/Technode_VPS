"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

type Role = "customer" | "admin"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("customer")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email || !password) {
      return
    }

    if (role === "admin") {
      router.push("/admin/dashboard")
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-secondary blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-7 shadow-lg sm:p-9">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Technode"
            width={180}
            height={44}
            className="mx-auto mb-4 h-11 w-auto"
            priority
          />
          <p className="text-xs font-semibold tracking-[0.14em] text-primary">TECHNODE DEMO</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Demo login without database connection</p>
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

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="role">
              Login as
            </label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold">
            Continue to {role === "admin" ? "Admin" : "Customer"} Dashboard
          </Button>
        </form>
      </div>
    </div>
  )
}
