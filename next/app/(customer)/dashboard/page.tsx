export default function CustomerDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Customer demo overview for tomorrow&apos;s presentation.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="card-glow rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">Active Units</p>
          <p className="mt-2 text-2xl font-semibold">12</p>
          <p className="mt-1 text-sm text-muted-foreground">4 units currently online</p>
        </article>
        <article className="card-glow rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">Today&apos;s Events</p>
          <p className="mt-2 text-2xl font-semibold">28</p>
          <p className="mt-1 text-sm text-muted-foreground">No critical alerts</p>
        </article>
        <article className="card-glow rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">Avg. Response</p>
          <p className="mt-2 text-2xl font-semibold">142 ms</p>
          <p className="mt-1 text-sm text-muted-foreground">Stable in the last 24 hours</p>
        </article>
      </section>
    </div>
  )
}
