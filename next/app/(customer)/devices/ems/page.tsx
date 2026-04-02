import Link from "next/link"

const units = [
  { id: "unit-alpha", title: "UNIT-ALPHA" },
  { id: "unit-bravo", title: "UNIT-BRAVO" },
  { id: "unit-charlie", title: "UNIT-CHARLIE" },
]

export default function CustomerDevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">EMS Devices</h1>
        <p className="text-sm text-muted-foreground">Select a unit from the sidebar or from the list below.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {units.map((unit) => (
          <Link
            href={`/devices/ems/${unit.id}/overview`}
            key={unit.id}
            className="card-glow rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Unit</p>
            <p className="mt-2 text-lg font-semibold">{unit.title}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
