"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
}

type DashboardShellProps = {
  areaLabel: string
  navItems: NavItem[]
  children: ReactNode
}

export function DashboardShell({ areaLabel, navItems, children }: DashboardShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-svh bg-muted/40">
      <aside className="hidden w-72 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="border-b px-5 py-5">
          <p className="text-xs font-semibold tracking-[0.15em] text-primary">TECHNODE</p>
          <h2 className="mt-1 text-lg font-semibold">{areaLabel}</h2>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-3">
          <Link
            href="/login"
            className="block rounded-xl border px-3 py-2 text-center text-sm font-medium text-foreground/70 transition hover:bg-muted"
          >
            Sign out
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-6">
          <p className="text-sm font-medium">{areaLabel}</p>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}

export function OverviewCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </article>
  )
}
