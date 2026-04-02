export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Operational summary for the demo admin view.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="card-glow rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">Customers</p>
          <p className="mt-2 text-2xl font-semibold">24</p>
          <p className="mt-1 text-sm text-muted-foreground">3 new this week</p>
        </article>
        <article className="card-glow rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">Connected Devices</p>
          <p className="mt-2 text-2xl font-semibold">317</p>
          <p className="mt-1 text-sm text-muted-foreground">94% healthy</p>
        </article>
        <article className="card-glow rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">Open Tickets</p>
          <p className="mt-2 text-2xl font-semibold">7</p>
          <p className="mt-1 text-sm text-muted-foreground">2 high priority</p>
        </article>
      </section>
    </div>
  )
}
