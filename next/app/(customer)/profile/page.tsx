"use client"

import { useUser } from "@/contexts/user-context"

export default function CustomerProfilePage() {
  const { user } = useUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Your account details from the current session.</p>
      </div>

      <div className="max-w-2xl rounded-2xl border bg-card p-5 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Name</dt>
            <dd className="mt-1 text-sm font-medium">{user?.customerRepresentative ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Plan</dt>
            <dd className="mt-1 text-sm font-medium">EMS Access</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Email</dt>
            <dd className="mt-1 text-sm font-medium">{user?.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Company</dt>
            <dd className="mt-1 text-sm font-medium">{user?.companyName ?? "-"}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
