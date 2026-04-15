const statusOnlineExample = `{
  "ID": "TN-862360078027385",
  "state": "online",
  "ts": "2026-04-15T12:34:56Z"
}`

const statusOfflineExample = `{
  "ID": "TN-862360078027385",
  "state": "offline",
  "reason": "lwt",
  "ts": "2026-04-15T12:36:00Z"
}`

const dataExample = `{
  "ID": "TN-862360078027385",
  "Location": "INDIA",
  "TS": "2026-04-15T12:35:12Z",
  "DT": "4G IOT GATEWAY",
  "RTU": [
    {
      "id": 1,
      "slave": "METER-1",
      "res": "OK",
      "data": [238, 237.8, 236.4],
      "datalen": 3
    }
  ]
}`

export default function AdminEmsDocsPage() {
  return (
    <div className="space-y-6 pb-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Admin Docs: EMS</h1>
      </header>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">MQTT Topics</h2>
        <div className="mt-3 space-y-2 text-sm">
          <p>
            <span className="font-semibold">Status topic:</span> <code>/{`{id}`}/status</code>
          </p>
          <p>
            <span className="font-semibold">Data topic:</span> <code>/{`{id}`}/data</code>
          </p>
          <p className="text-muted-foreground">
            Worker subscribes to: <code>+/status</code>, <code>/+/status</code>, <code>+/data</code>, <code>/+/data</code>.
          </p>
        </div>
      </section>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Online/Offline Rule</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          <li>
            Primary source is latest valid <code>/status</code> payload (<code>state=online|offline</code>).
          </li>
          <li>
            Fallback source is <code>/data</code>: if status is missing or stale, and latest data is within 2 minutes,
            status is shown as <code>Online</code>.
          </li>
          <li>If neither fresh status nor fresh data exists, status is <code>Offline</code>.</li>
        </ul>
      </section>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">JSON</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border bg-white/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Online</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/95 p-3 text-xs text-slate-100">{statusOnlineExample}</pre>
          </article>
          <article className="rounded-xl border bg-white/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Offline (LWT)</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/95 p-3 text-xs text-slate-100">{statusOfflineExample}</pre>
          </article>
          <article className="rounded-xl border bg-white/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data Payload</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/95 p-3 text-xs text-slate-100">{dataExample}</pre>
          </article>
        </div>
      </section>
    </div>
  )
}
