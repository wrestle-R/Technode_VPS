const units = [
  { id: "EMS-001", location: "Plant A", status: "Online" },
  { id: "EMS-014", location: "Plant B", status: "Online" },
  { id: "EMS-023", location: "Warehouse", status: "Maintenance" },
]

export default function AdminEmsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">EMS Units</h1>
        <p className="text-sm text-muted-foreground">All device units visible to admin.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {units.map((unit) => (
          <article className="card-glow rounded-2xl border bg-card p-5 shadow-sm" key={unit.id}>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Unit ID</p>
            <p className="mt-1 text-xl font-semibold">{unit.id}</p>
            <p className="mt-3 text-sm text-muted-foreground">{unit.location}</p>
            <p className="mt-1 text-sm font-medium">Status: {unit.status}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
