import Link from "next/link"

export default function AdminDocsPage() {
  return (
    <div className="space-y-6 pb-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Admin Docs</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Central documentation sections for admin operations.
        </p>
      </header>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Sections</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/docs/ems"
            className="rounded-xl border bg-white/80 p-4 transition hover:bg-white"
          >
            <p className="text-sm font-semibold">EMS</p>
            <p className="mt-1 text-xs text-muted-foreground">
              MQTT topics, online/offline rule, and JSON payload reference.
            </p>
          </Link>
        </div>
      </section>
    </div>
  )
}
