const devices = [
  { id: "EMS-001", location: "Plant A", status: "Online" },
  { id: "EMS-014", location: "Plant B", status: "Online" },
  { id: "EMS-023", location: "Warehouse", status: "Maintenance" },
]

export default function AdminDevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Devices</h1>
        <p className="text-sm text-muted-foreground">Admin device inventory shell for demo purposes.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => (
          <article key={device.id} className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Unit ID</p>
            <p className="mt-1 text-xl font-semibold">{device.id}</p>
            <p className="mt-3 text-sm text-muted-foreground">{device.location}</p>
            <p className="mt-1 text-sm font-medium">Status: {device.status}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
