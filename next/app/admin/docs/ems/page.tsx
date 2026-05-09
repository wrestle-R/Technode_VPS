const connectionOnlineExample = `{
  "ID": "862360079818097",
  "MODEL": "TIG5 [4G RS485 IOT GATEWAY]",
  "Status": "Online",
  "Signal": 74,
  "Location": "INDIA",
  "TS": "1778355673",
  "DT": "2026-05-09 19:41:13"
}`

const connectionOfflineExample = `{
  "ID": "862360079818097",
  "MODEL": "TIG5 [4G RS485 IOT GATEWAY]",
  "Status": "Offline",
  "Signal": 74,
  "Location": "INDIA",
  "TS": "1778355673",
  "DT": "2026-05-09 19:41:13"
}`

const dataExample = `{
  "ID": "862360079818097",
  "Status": "Online",
  "Signal": 70,
  "Location": "INDIA",
  "data": {
    "1": {
      "name": "MFM-1",
      "VRN": 251.5,
      "VYN": 253.34,
      "VBN": 243.89,
      "VRY": 433.89,
      "VYB": 433.26,
      "VBR": 430.51,
      "IR": 0,
      "IY": 0,
      "IB": 0,
      "KW-R": 0,
      "KW-Y": 0,
      "KW-B": 0,
      "PF-R": 1,
      "PF-Y": 1,
      "PF-B": 1,
      "Freq": 50.31,
      "Kwh": 0,
      "KvAh": 0,
      "KvArh": 0
    }
  },
  "TS": "1778356802",
  "DT": "2026-05-09 20:00:02"
}`

export default function AdminEmsDocsPage() {
  return (
    <div className="space-y-6 pb-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Admin Docs: EMS Protocol</h1>
      </header>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">MQTT Topics</h2>
        <div className="mt-3 space-y-2 text-sm">
          <p>
            <span className="font-semibold">Connection topic:</span> <code>/{`{id}`}/connection</code>
          </p>
          <p>
            <span className="font-semibold">Data topic:</span> <code>/{`{id}`}/data</code>
          </p>
          <p className="text-muted-foreground">
            Worker subscribes to: <code>+/connection</code>, <code>/+/connection</code>, <code>+/data</code>, <code>/+/data</code>.
          </p>
        </div>
      </section>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Validation Rules</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          <li>
            <code>ID</code> must be numeric only. Prefix formats like <code>TN-*</code> are rejected.
          </li>
          <li>
            Topic unit id and payload <code>ID</code> must match exactly.
          </li>
          <li>
            Location key is strict ASCII <code>Location</code>. Unicode variants are not parsed.
          </li>
        </ul>
      </section>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Online/Offline Mapping</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          <li>
            Primary status source is <code>/connection</code> payload <code>Status</code> with values <code>Online</code>/<code>Offline</code>.
          </li>
          <li>
            Offline connection (LWT style) should publish <code>Status: Offline</code> and is treated as authoritative.
          </li>
          <li>
            Data payloads are telemetry snapshots; they do not use RTU mapping or scaling.
          </li>
        </ul>
      </section>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">JSON Examples</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border bg-white/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Connection Online</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/95 p-3 text-xs text-slate-100">{connectionOnlineExample}</pre>
          </article>
          <article className="rounded-xl border bg-white/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Connection Offline</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/95 p-3 text-xs text-slate-100">{connectionOfflineExample}</pre>
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
